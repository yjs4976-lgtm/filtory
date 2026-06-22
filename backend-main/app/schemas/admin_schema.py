from app.schemas.member_schema import member_to_dict


def admin_member_to_dict(member, activity_counts=None):
    activity_counts = activity_counts or {}
    data = member_to_dict(member)

    return {
        **data,
        "name": data["real_name"],
        "status": (member.status or "active").upper(),
        "role": (member.role or "user").upper(),
        "createdAt": data["created_at"],
        "lastLoginAt": data["last_login_at"],
        "analysisCount": activity_counts.get("analysis_count", 0),
        "savedHospitalCount": activity_counts.get("saved_hospital_count", 0),
        "reportCount": activity_counts.get("report_count", 0),
    }
