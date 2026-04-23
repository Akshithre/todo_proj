"""
Email service using Gmail SMTP for sending invite emails.
"""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_invite_email(
    to_email: str,
    inviter_name: str,
    org_name: str,
    team_name: str,
    invite_token: str,
) -> bool:
    """Send an invite email. Returns True on success, False on failure."""
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        logger.error("SMTP credentials not configured")
        return False

    invite_url = f"{FRONTEND_URL}/accept-invite/{invite_token}"

    msg = MIMEMultipart("alternative")
    msg["From"] = f"TaskOptimizer <{SMTP_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = f"{inviter_name} invited you to join {org_name} on TaskOptimizer"

    text = f"""
Hi there,

{inviter_name} has invited you to join the team "{team_name}" in the {org_name} organization on TaskOptimizer.

Click the link below to accept the invitation:
{invite_url}

If you don't have an account yet, you'll be able to create one when you click the link.

- The TaskOptimizer Team
"""

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f1729;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1729;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#1a2332;border-radius:16px;border:1px solid #2a3444;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                TaskOptimizer
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Smart Task Management
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:600;">
                You're invited!
              </h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                <strong style="color:#e2e8f0;">{inviter_name}</strong> has invited you to join
                the <strong style="color:#e2e8f0;">{team_name}</strong> team in the
                <strong style="color:#e2e8f0;">{org_name}</strong> organization.
              </p>
              <!-- Info card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1729;border-radius:12px;border:1px solid #2a3444;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="color:#64748b;font-size:13px;">Organization</span>
                        </td>
                        <td style="padding:4px 0;text-align:right;">
                          <span style="color:#e2e8f0;font-size:13px;font-weight:500;">{org_name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="color:#64748b;font-size:13px;">Team</span>
                        </td>
                        <td style="padding:4px 0;text-align:right;">
                          <span style="color:#e2e8f0;font-size:13px;font-weight:500;">{team_name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="color:#64748b;font-size:13px;">Invited by</span>
                        </td>
                        <td style="padding:4px 0;text-align:right;">
                          <span style="color:#e2e8f0;font-size:13px;font-weight:500;">{inviter_name}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{invite_url}"
                       style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                              color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;
                              font-size:15px;font-weight:600;letter-spacing:0.3px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#64748b;font-size:13px;text-align:center;line-height:1.5;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="{invite_url}" style="color:#818cf8;text-decoration:none;word-break:break-all;">
                  {invite_url}
                </a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a3444;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;">
                This invitation was sent by {inviter_name} via TaskOptimizer.
                <br>If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.send_message(msg)
        logger.info("Invite email sent to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send invite email to %s: %s", to_email, e)
        return False
