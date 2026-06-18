from datetime import datetime, timezone

from app.extensions import db
from app.repositories import ReportRepository
from app.schemas import extract_report_data, report_to_dict
from app.utils.validators import validate_report_target


class ReportService:
    STATUSES = {"pending", "reviewing", "resolved", "rejected"}
    REPORT_TYPES = {
        "spam",
        "ad_suspicion",
        "inaccurate_analysis",
        "inappropriate_content",
        "wrong_hospital_info",
        "other",
    }

    @staticmethod
    def list_reports(status=None, limit=20, offset=0):
        if status and status not in ReportService.STATUSES:
            raise ValueError("Invalid report status")

        reports = ReportRepository.list_by_status(status=status, limit=limit, offset=offset)
        return [report_to_dict(report) for report in reports]

    @staticmethod
    def get_report(report_id):
        report = ReportRepository.get_by_id(report_id)
        if not report:
            raise ValueError("Report not found")
        return report_to_dict(report)

    @staticmethod
    def create_report(payload):
        data = extract_report_data(payload)
        ReportService._validate_report_data(data)

        try:
            report = ReportRepository.create(data)
            db.session.commit()
            return report_to_dict(report)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_report(report_id, payload):
        report = ReportRepository.get_by_id(report_id)
        if not report:
            raise ValueError("Report not found")

        data = extract_report_data(payload)
        ReportService._validate_report_data(data, partial=True)

        try:
            report = ReportRepository.update(report, data)
            db.session.commit()
            return report_to_dict(report)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def resolve_report(report_id, payload):
        report = ReportRepository.get_by_id(report_id)
        if not report:
            raise ValueError("Report not found")

        data = {
            "status": payload.get("status", "resolved"),
            "admin_member_id": payload.get("admin_member_id"),
            "admin_memo": payload.get("admin_memo"),
            "resolved_at": datetime.now(timezone.utc),
        }

        ReportService._validate_report_data(data, partial=True)

        try:
            report = ReportRepository.update(report, data)
            db.session.commit()
            return report_to_dict(report)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _validate_report_data(data, partial=False):
        if not partial and not data.get("report_type"):
            raise ValueError("report_type is required")

        if not partial:
            validate_report_target(data)

        if data.get("report_type") and data["report_type"] not in ReportService.REPORT_TYPES:
            raise ValueError("Invalid report type")

        if data.get("status") and data["status"] not in ReportService.STATUSES:
            raise ValueError("Invalid report status")
