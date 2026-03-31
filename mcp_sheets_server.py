"""
MCP Server for Google Sheets integration.
Exports TaskOptimizer data (reports, analytics, task lists) to Google Sheets.
"""
import os
import json
import logging
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

import pyodbc
import gspread
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp-sheets")

CONNECTION_STRING = os.getenv("AZURE_SQL_CONNECTION_STRING", "")
GOOGLE_CREDS_PATH = r"C:\Users\pooji\OneDrive\Desktop\todo_proj\todo_proj\google_credentials.json"
SPREADSHEET_ID = "1zBKVBg6SdNEbaSceYg2e3zyxrxHQ-_uocTpY8QaYhV0"

mcp = FastMCP(
    "Google Sheets Reporter",
    instructions="""You can export TaskOptimizer data to Google Sheets.
Use these tools to push task reports, analytics, team summaries, and
custom query results into the connected Google Spreadsheet.""",
)


def get_db():
    """Get a fresh pyodbc connection to Azure SQL."""
    return pyodbc.connect(CONNECTION_STRING, timeout=30)


def get_sheets():
    """Get authenticated gspread client and spreadsheet."""
    gc = gspread.service_account(filename=GOOGLE_CREDS_PATH)
    return gc.open_by_key(SPREADSHEET_ID)


def safe(val):
    """Convert DB values to sheet-safe types."""
    if val is None:
        return ""
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d %H:%M")
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, bytes):
        return ""
    return val


def get_or_create_sheet(spreadsheet, name):
    """Get existing worksheet or create a new one."""
    try:
        ws = spreadsheet.worksheet(name)
        ws.clear()
        return ws
    except gspread.exceptions.WorksheetNotFound:
        return spreadsheet.add_worksheet(title=name, rows=500, cols=26)


@mcp.tool()
def export_all_tasks(org_id: int) -> str:
    """Export all tasks for an organization to a 'Tasks' sheet.
    Includes task name, priority, status, assignee, category, dates, and time tracking.

    Args:
        org_id: The organization ID to export tasks for
    """
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.task_id, t.task_name, t.priority, t.status, t.category,
                   t.description, t.deadline, t.estimated_time, t.actual_time,
                   t.created_at, t.is_archived,
                   u1.full_name AS creator, u2.full_name AS assignee,
                   tm.name AS team_name
            FROM tasks t
            LEFT JOIN users u1 ON t.user_id = u1.user_id
            LEFT JOIN users u2 ON t.assigned_to = u2.user_id
            LEFT JOIN teams tm ON t.team_id = tm.team_id
            WHERE t.org_id = ?
            ORDER BY t.created_at DESC
        """, org_id)

        headers = ["ID", "Task Name", "Priority", "Status", "Category",
                    "Description", "Deadline", "Est. Hours", "Actual Hours",
                    "Created At", "Archived", "Creator", "Assignee", "Team"]
        rows = [[safe(v) for v in row] for row in cursor.fetchall()]

        sh = get_sheets()
        ws = get_or_create_sheet(sh, "Tasks")
        ws.update([headers] + rows)

        # Format header row bold
        ws.format("A1:N1", {"textFormat": {"bold": True},
                             "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.35}})

        return f"Exported {len(rows)} tasks to 'Tasks' sheet."
    finally:
        conn.close()


@mcp.tool()
def export_team_report(org_id: int) -> str:
    """Export a team performance report to a 'Team Report' sheet.
    Shows each team's member count, task breakdown, and avg completion time.

    Args:
        org_id: The organization ID
    """
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT tm.name AS team_name, tm.color,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = tm.team_id) AS members,
                   COUNT(t.task_id) AS total_tasks,
                   SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                   SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
                   SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                   ROUND(AVG(CASE WHEN t.status = 'Completed' THEN t.actual_time END), 1) AS avg_hours,
                   ROUND(
                       CASE WHEN COUNT(t.task_id) > 0
                       THEN CAST(SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(t.task_id) * 100
                       ELSE 0 END, 1
                   ) AS completion_rate
            FROM teams tm
            LEFT JOIN tasks t ON t.team_id = tm.team_id
            WHERE tm.org_id = ?
            GROUP BY tm.team_id, tm.name, tm.color
            ORDER BY completed DESC
        """, org_id)

        headers = ["Team", "Color", "Members", "Total Tasks", "Completed",
                    "In Progress", "Pending", "Avg Hours", "Completion %"]
        rows = [[safe(v) for v in row] for row in cursor.fetchall()]

        sh = get_sheets()
        ws = get_or_create_sheet(sh, "Team Report")
        ws.update([headers] + rows)
        ws.format("A1:I1", {"textFormat": {"bold": True},
                             "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.35}})

        return f"Exported {len(rows)} teams to 'Team Report' sheet."
    finally:
        conn.close()


@mcp.tool()
def export_member_productivity(org_id: int) -> str:
    """Export member productivity stats to a 'Productivity' sheet.
    Shows tasks completed, avg time, overdue tasks per member.

    Args:
        org_id: The organization ID
    """
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.full_name, u.email, u.role,
                   COUNT(t.task_id) AS total_assigned,
                   SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                   SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
                   SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                   SUM(CASE WHEN t.deadline < GETUTCDATE() AND t.status != 'Completed' THEN 1 ELSE 0 END) AS overdue,
                   ROUND(AVG(CASE WHEN t.status = 'Completed' THEN t.actual_time END), 1) AS avg_completion_hours,
                   ROUND(SUM(CASE WHEN t.status = 'Completed' THEN t.actual_time ELSE 0 END), 1) AS total_hours_logged,
                   ROUND(
                       CASE WHEN COUNT(t.task_id) > 0
                       THEN CAST(SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(t.task_id) * 100
                       ELSE 0 END, 1
                   ) AS completion_rate
            FROM users u
            LEFT JOIN tasks t ON t.assigned_to = u.user_id AND t.org_id = ?
            WHERE u.org_id = ?
            GROUP BY u.user_id, u.full_name, u.email, u.role
            ORDER BY completed DESC
        """, org_id, org_id)

        headers = ["Name", "Email", "Role", "Total Assigned", "Completed",
                    "In Progress", "Pending", "Overdue", "Avg Hours/Task",
                    "Total Hours", "Completion %"]
        rows = [[safe(v) for v in row] for row in cursor.fetchall()]

        sh = get_sheets()
        ws = get_or_create_sheet(sh, "Productivity")
        ws.update([headers] + rows)
        ws.format("A1:K1", {"textFormat": {"bold": True},
                             "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.35}})

        return f"Exported productivity stats for {len(rows)} members to 'Productivity' sheet."
    finally:
        conn.close()


@mcp.tool()
def export_weekly_summary(org_id: int) -> str:
    """Export a weekly summary to a 'Weekly Summary' sheet.
    Shows tasks created/completed per week for the last 12 weeks.

    Args:
        org_id: The organization ID
    """
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DATEPART(iso_week, created_at) AS week_num,
                   DATEPART(year, created_at) AS year,
                   MIN(CAST(created_at AS DATE)) AS week_start,
                   COUNT(*) AS tasks_created,
                   SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS tasks_completed,
                   SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS high_priority,
                   ROUND(AVG(CASE WHEN status = 'Completed' THEN actual_time END), 1) AS avg_completion_hours
            FROM tasks
            WHERE org_id = ? AND created_at >= DATEADD(week, -12, GETUTCDATE())
            GROUP BY DATEPART(iso_week, created_at), DATEPART(year, created_at)
            ORDER BY year, week_num
        """, org_id)

        headers = ["Week #", "Year", "Week Start", "Created", "Completed",
                    "High Priority", "Avg Hours"]
        rows = [[safe(v) for v in row] for row in cursor.fetchall()]

        sh = get_sheets()
        ws = get_or_create_sheet(sh, "Weekly Summary")
        ws.update([headers] + rows)
        ws.format("A1:G1", {"textFormat": {"bold": True},
                             "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.35}})

        return f"Exported {len(rows)} weeks of data to 'Weekly Summary' sheet."
    finally:
        conn.close()


@mcp.tool()
def export_custom_query(sheet_name: str, sql: str) -> str:
    """Run a custom SELECT query and export results to a named sheet.
    Only SELECT queries are allowed.

    Args:
        sheet_name: Name for the sheet tab (e.g. 'Custom Report')
        sql: SQL SELECT query to run
    """
    stripped = sql.strip().upper()
    if not stripped.startswith("SELECT"):
        return "ERROR: Only SELECT queries are allowed."
    dangerous = ["INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "TRUNCATE ",
                 "EXEC ", "EXECUTE ", "CREATE ", "GRANT ", "REVOKE "]
    for kw in dangerous:
        if kw in stripped:
            return f"ERROR: Query contains forbidden keyword: {kw.strip()}"

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        if not cursor.description:
            return "Query returned no results."

        headers = [col[0] for col in cursor.description]
        rows = [[safe(v) for v in row] for row in cursor.fetchall()]

        if len(rows) > 500:
            rows = rows[:500]

        sh = get_sheets()
        ws = get_or_create_sheet(sh, sheet_name)
        ws.update([headers] + rows)
        ws.format(f"A1:{chr(64+len(headers))}1", {
            "textFormat": {"bold": True},
            "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.35}
        })

        return f"Exported {len(rows)} rows to '{sheet_name}' sheet."
    except Exception as e:
        return f"Error: {str(e)}"
    finally:
        conn.close()


@mcp.tool()
def export_full_report(org_id: int) -> str:
    """Export a complete report with all sheets at once: Tasks, Team Report,
    Productivity, and Weekly Summary. One-click full data export.

    Args:
        org_id: The organization ID to generate the full report for
    """
    results = []
    results.append(export_all_tasks(org_id))
    results.append(export_team_report(org_id))
    results.append(export_member_productivity(org_id))
    results.append(export_weekly_summary(org_id))
    return "Full report exported!\n" + "\n".join(f"  - {r}" for r in results)


if __name__ == "__main__":
    mcp.run(transport="stdio")
