from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    settings = get_settings()
    return bool(settings.smtp_user and settings.smtp_password)


def send_survey_invitation_email(
    *,
    to_email: str,
    employee_name: str,
    survey_title: str,
    survey_link: str,
) -> None:
    settings = get_settings()
    if not _smtp_configured():
        raise RuntimeError("SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD in backend/.env")

    sender = settings.smtp_from or settings.smtp_user
    subject = f"Employee Survey: {survey_title}"
    plain_body = (
        f"Hello {employee_name},\n\n"
        f"You have been invited to complete the survey \"{survey_title}\".\n\n"
        f"Open this link to respond:\n{survey_link}\n\n"
        "This link is personal to you. Please do not share it.\n\n"
        "Thank you,\nHR Team"
    )
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
        <p>Hello {employee_name},</p>
        <p>You have been invited to complete the survey <strong>{survey_title}</strong>.</p>
        <p>
          <a href="{survey_link}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
            Take Survey
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">Or copy this link:<br><a href="{survey_link}">{survey_link}</a></p>
        <p style="font-size: 13px; color: #666;">This link is personal to you. Please do not share it.</p>
        <p>Thank you,<br>HR Team</p>
      </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = to_email
    message.attach(MIMEText(plain_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(sender, [to_email], message.as_string())

    logger.info("Survey invitation sent to %s", to_email)
