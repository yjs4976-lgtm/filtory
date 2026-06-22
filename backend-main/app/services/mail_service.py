import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from flask import current_app, render_template


class MailService:
    @staticmethod
    def send_password_reset_email(email, reset_token):
        if not email or not reset_token:
            raise ValueError("email and reset_token are required")

        frontend_base_url = current_app.config.get("FRONTEND_BASE_URL", "").rstrip("/")
        # URL fragments are handled by the browser and are not sent in the HTTP
        # request, so the one-time token is not written to frontend access logs.
        reset_url = (
            f"{frontend_base_url}/reset-password#token={quote(reset_token, safe='')}"
            if frontend_base_url
            else reset_token
        )

        subject = "[Filtory] Password reset request"
        html_body = render_template("emails/password_reset.html", reset_url=reset_url)
        text_body = f"Use this link to reset your password: {reset_url}"

        return MailService.send_email(email, subject, text_body, html_body)

    @staticmethod
    def send_email_verification_email(email, verification_token):
        if not email or not verification_token:
            raise ValueError("email and verification_token are required")

        frontend_base_url = current_app.config.get("FRONTEND_BASE_URL", "").rstrip("/")
        verification_url = (
            f"{frontend_base_url}/verify-email?token={verification_token}"
            if frontend_base_url
            else verification_token
        )
        return MailService.send_email(
            email,
            "[Filtory] Verify your email address",
            f"Use this link to verify your email address: {verification_url}",
        )

    @staticmethod
    def send_email(to_email, subject, text_body, html_body=None):
        smtp_host = current_app.config.get("SMTP_HOST")
        sender = current_app.config.get("SMTP_DEFAULT_SENDER")

        if not smtp_host or not sender:
            return {
                "sent": False,
                "reason": "mail_not_configured",
            }

        message = EmailMessage()
        message["From"] = sender
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(text_body)

        if html_body:
            message.add_alternative(html_body, subtype="html")

        smtp_port = current_app.config.get("SMTP_PORT", 587)
        smtp_username = current_app.config.get("SMTP_USERNAME")
        smtp_password = current_app.config.get("SMTP_PASSWORD")
        use_tls = current_app.config.get("SMTP_USE_TLS", True)

        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            if use_tls:
                smtp.starttls()

            if smtp_username and smtp_password:
                smtp.login(smtp_username, smtp_password)

            smtp.send_message(message)

        return {"sent": True}
