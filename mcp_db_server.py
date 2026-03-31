"""
MCP Server for Azure SQL Database.
Gives Claude direct read access to query the todo-db database.
Only SELECT queries are allowed for safety.
"""
import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal

from dotenv import load_dotenv

# Load .env from same directory
load_dotenv(Path(__file__).resolve().parent / ".env")

import pyodbc
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp-azure-sql")

CONNECTION_STRING = os.getenv("AZURE_SQL_CONNECTION_STRING", "")

mcp = FastMCP(
    "Azure SQL Database",
    instructions="""You have access to the TaskOptimizer Azure SQL database.
Use the tools to query data, explore the schema, and generate insights.
IMPORTANT: Only SELECT queries are allowed. No modifications to data.""",
)


def get_connection():
    """Get a fresh pyodbc connection."""
    if not CONNECTION_STRING:
        raise RuntimeError("AZURE_SQL_CONNECTION_STRING not configured")
    return pyodbc.connect(CONNECTION_STRING, timeout=30)


def serialize_value(val):
    """Convert DB values to JSON-safe types."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, bytes):
        return val.hex()
    return val


def rows_to_dicts(cursor) -> list[dict]:
    """Convert cursor results to list of dicts."""
    columns = [col[0] for col in cursor.description]
    return [
        {col: serialize_value(val) for col, val in zip(columns, row)}
        for row in cursor.fetchall()
    ]


@mcp.tool()
def list_tables() -> str:
    """List all tables in the database with their row counts."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.TABLE_NAME,
                   p.rows AS row_count
            FROM INFORMATION_SCHEMA.TABLES t
            JOIN sys.partitions p ON OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME) = p.object_id
            WHERE t.TABLE_TYPE = 'BASE TABLE' AND p.index_id IN (0, 1)
            ORDER BY t.TABLE_NAME
        """)
        results = rows_to_dicts(cursor)
        return json.dumps(results, indent=2)
    finally:
        conn.close()


@mcp.tool()
def describe_table(table_name: str) -> str:
    """Get column names, types, and constraints for a specific table.

    Args:
        table_name: Name of the table to describe (e.g. 'tasks', 'users')
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        # Validate table exists (prevent injection)
        cursor.execute(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?",
            table_name,
        )
        if not cursor.fetchone():
            return f"Table '{table_name}' not found."

        cursor.execute("""
            SELECT c.COLUMN_NAME, c.DATA_TYPE, c.CHARACTER_MAXIMUM_LENGTH,
                   c.IS_NULLABLE, c.COLUMN_DEFAULT,
                   CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES' ELSE 'NO' END AS IS_PRIMARY_KEY,
                   fk.REFERENCED_TABLE_NAME, fk.REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN (
                SELECT ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                WHERE tc.TABLE_NAME = ? AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
            LEFT JOIN (
                SELECT cu.COLUMN_NAME, cu2.TABLE_NAME AS REFERENCED_TABLE_NAME, cu2.COLUMN_NAME AS REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE cu ON rc.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE cu2 ON rc.UNIQUE_CONSTRAINT_NAME = cu2.CONSTRAINT_NAME
                WHERE cu.TABLE_NAME = ?
            ) fk ON c.COLUMN_NAME = fk.COLUMN_NAME
            WHERE c.TABLE_NAME = ?
            ORDER BY c.ORDINAL_POSITION
        """, table_name, table_name, table_name)
        results = rows_to_dicts(cursor)
        return json.dumps(results, indent=2)
    finally:
        conn.close()


@mcp.tool()
def query_database(sql: str) -> str:
    """Execute a read-only SQL query against the Azure SQL database.
    Only SELECT statements are allowed.

    Args:
        sql: The SQL SELECT query to execute. Must start with SELECT.
    """
    # Safety: only allow SELECT queries
    stripped = sql.strip().upper()
    if not stripped.startswith("SELECT"):
        return "ERROR: Only SELECT queries are allowed. No INSERT, UPDATE, DELETE, DROP, ALTER, etc."

    # Block dangerous keywords even in subqueries
    dangerous = ["INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "TRUNCATE ",
                 "EXEC ", "EXECUTE ", "CREATE ", "GRANT ", "REVOKE ", "xp_", "sp_"]
    for kw in dangerous:
        if kw in stripped:
            return f"ERROR: Query contains forbidden keyword: {kw.strip()}"

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        if cursor.description is None:
            return "Query executed but returned no result set."
        results = rows_to_dicts(cursor)
        # Limit output to prevent huge responses
        total = len(results)
        if total > 100:
            results = results[:100]
            return json.dumps({
                "note": f"Showing first 100 of {total} rows. Add TOP or WHERE to narrow results.",
                "rows": results,
            }, indent=2)
        return json.dumps({"row_count": total, "rows": results}, indent=2)
    except Exception as e:
        return f"SQL Error: {str(e)}"
    finally:
        conn.close()


@mcp.tool()
def get_org_summary(org_id: int) -> str:
    """Get a comprehensive summary of an organization including member count,
    team count, task statistics, and recent activity.

    Args:
        org_id: The organization ID to summarize
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        summary = {}

        # Org info
        cursor.execute("SELECT org_id, name, slug, [plan], created_at FROM organizations WHERE org_id = ?", org_id)
        row = cursor.fetchone()
        if not row:
            return f"Organization {org_id} not found."
        cols = [c[0] for c in cursor.description]
        summary["organization"] = {c: serialize_value(v) for c, v in zip(cols, row)}

        # User count
        cursor.execute("SELECT COUNT(*) FROM users WHERE org_id = ?", org_id)
        summary["member_count"] = cursor.fetchone()[0]

        # Team count
        cursor.execute("SELECT COUNT(*) FROM teams WHERE org_id = ?", org_id)
        summary["team_count"] = cursor.fetchone()[0]

        # Task stats
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                   SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
            FROM tasks WHERE org_id = ?
        """, org_id)
        row = cursor.fetchone()
        summary["tasks"] = {
            "total": row[0], "completed": row[1],
            "in_progress": row[2], "pending": row[3],
        }

        # Top contributors (by completed tasks)
        cursor.execute("""
            SELECT TOP 5 u.full_name, COUNT(t.task_id) as completed_tasks
            FROM users u
            JOIN tasks t ON t.assigned_to = u.user_id
            WHERE t.org_id = ? AND t.status = 'Completed'
            GROUP BY u.full_name
            ORDER BY completed_tasks DESC
        """, org_id)
        summary["top_contributors"] = rows_to_dicts(cursor)

        # Recent activity (last 5)
        cursor.execute("""
            SELECT TOP 5 al.action, al.entity_type, al.metadata_json, al.created_at, u.full_name
            FROM activity_log al
            JOIN users u ON al.user_id = u.user_id
            WHERE al.org_id = ?
            ORDER BY al.created_at DESC
        """, org_id)
        summary["recent_activity"] = rows_to_dicts(cursor)

        return json.dumps(summary, indent=2)
    finally:
        conn.close()


@mcp.tool()
def get_team_analytics(team_id: int) -> str:
    """Get detailed analytics for a team: workload distribution, task completion
    rates, average completion time by category, and member productivity.

    Args:
        team_id: The team ID to analyze
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        analytics = {}

        # Team info
        cursor.execute("SELECT team_id, name, org_id FROM teams WHERE team_id = ?", team_id)
        row = cursor.fetchone()
        if not row:
            return f"Team {team_id} not found."
        analytics["team"] = {"team_id": row[0], "name": row[1], "org_id": row[2]}

        # Member workload
        cursor.execute("""
            SELECT u.full_name,
                   COUNT(CASE WHEN t.status = 'Pending' THEN 1 END) as pending,
                   COUNT(CASE WHEN t.status = 'In Progress' THEN 1 END) as in_progress,
                   COUNT(CASE WHEN t.status = 'Completed' THEN 1 END) as completed,
                   ROUND(AVG(t.actual_time), 1) as avg_hours
            FROM team_members tm
            JOIN users u ON tm.user_id = u.user_id
            LEFT JOIN tasks t ON t.assigned_to = u.user_id AND t.team_id = ?
            WHERE tm.team_id = ?
            GROUP BY u.full_name
            ORDER BY completed DESC
        """, team_id, team_id)
        analytics["member_workload"] = rows_to_dicts(cursor)

        # Avg completion time by category
        cursor.execute("""
            SELECT category,
                   COUNT(*) as task_count,
                   ROUND(AVG(actual_time), 1) as avg_hours,
                   ROUND(AVG(estimated_time), 1) as avg_estimated
            FROM tasks
            WHERE team_id = ? AND status = 'Completed' AND actual_time IS NOT NULL
            GROUP BY category
            ORDER BY task_count DESC
        """, team_id)
        analytics["completion_by_category"] = rows_to_dicts(cursor)

        # Completion trend (tasks completed per week, last 8 weeks)
        cursor.execute("""
            SELECT DATEPART(iso_week, created_at) as week_num,
                   DATEPART(year, created_at) as year,
                   COUNT(*) as completed
            FROM tasks
            WHERE team_id = ? AND status = 'Completed'
              AND created_at >= DATEADD(week, -8, GETUTCDATE())
            GROUP BY DATEPART(iso_week, created_at), DATEPART(year, created_at)
            ORDER BY year, week_num
        """, team_id)
        analytics["weekly_completion_trend"] = rows_to_dicts(cursor)

        return json.dumps(analytics, indent=2)
    finally:
        conn.close()


if __name__ == "__main__":
    mcp.run(transport="stdio")
