def _isoformat(value):
    return value.isoformat() if value else None


REPORT_FIELDS = {
    "reporter_member_id",
    "hospital_id",
    "review_id",
    "analysis_result_id",
    "report_type",
    "report_reason",
    "status",
    "admin_member_id",
    "admin_memo",
    "resolved_at",
}


def report_to_dict(report):
    if report is None:
        return None

    return {
        "id": report.id,
        "reporter_member_id": report.reporter_member_id,
        "hospital_id": report.hospital_id,
        "review_id": report.review_id,
        "analysis_result_id": report.analysis_result_id,
        "report_type": report.report_type,
        "report_reason": report.report_reason,
        "status": report.status,
        "admin_member_id": report.admin_member_id,
        "admin_memo": report.admin_memo,
        "resolved_at": _isoformat(report.resolved_at),
        "created_at": _isoformat(report.created_at),
        "updated_at": _isoformat(report.updated_at),
    }


def extract_report_data(payload):
    return {
        key: payload[key]
        for key in REPORT_FIELDS
        if key in payload
    }
