from datetime import datetime, timezone

from app.extensions import db
from app.repositories import AdminRepository
from app.schemas import admin_member_to_dict


class AdminService:
    ROLES = {"user", "admin"}
    STATUSES = {"active", "suspended", "withdrawn", "dormant"}

    @staticmethod
    def get_summary():
        return {
            "totalUsers": AdminRepository.count_members(),
            "activeUsers": AdminRepository.count_members(status="active"),
            "suspendedUsers": AdminRepository.count_members(status="suspended"),
            "withdrawnUsers": AdminRepository.count_members(status="withdrawn"),
        }

    @staticmethod
    def list_members(keyword=None, status=None, role=None, limit=20, offset=0):
        normalized_status = AdminService._normalize_status(status) if status else None
        normalized_role = AdminService._normalize_role(role) if role else None
        members = AdminRepository.list_members(
            keyword=keyword,
            status=normalized_status,
            role=normalized_role,
            limit=limit,
            offset=offset,
        )
        return [AdminService._member_to_dict(member) for member in members]

    @staticmethod
    def get_member(member_id):
        member = AdminRepository.get_member_by_id(member_id)
        if not member:
            raise ValueError("Member not found")
        return AdminService._member_to_dict(member)

    @staticmethod
    def update_member_role(member_id, role, admin_member_id):
        member = AdminService._get_mutable_member(member_id, admin_member_id)
        normalized_role = AdminService._normalize_role(role)
        before = {"role": member.role}

        try:
            AdminRepository.update_member(member, {"role": normalized_role})
            AdminService._create_audit_log(
                admin_member_id,
                "member_update",
                member.id,
                before,
                {"role": normalized_role},
            )
            db.session.commit()
            return AdminService._member_to_dict(member)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_member_status(member_id, status, admin_member_id):
        member = AdminService._get_mutable_member(member_id, admin_member_id)
        normalized_status = AdminService._normalize_status(status)
        before = {
            "status": member.status,
            "active": member.active,
            "deleted_at": member.deleted_at.isoformat() if member.deleted_at else None,
        }
        data = AdminService._status_update_data(normalized_status)

        try:
            AdminRepository.update_member(member, data)
            AdminService._create_audit_log(
                admin_member_id,
                "member_update",
                member.id,
                before,
                {"status": normalized_status},
            )
            db.session.commit()
            return AdminService._member_to_dict(member)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def withdraw_member(member_id, admin_member_id):
        member = AdminService._get_mutable_member(member_id, admin_member_id)
        before = {"status": member.status}

        try:
            AdminRepository.update_member(member, AdminService._status_update_data("withdrawn"))
            AdminService._create_audit_log(
                admin_member_id,
                "member_deactivate",
                member.id,
                before,
                {"status": "withdrawn"},
            )
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _member_to_dict(member):
        return admin_member_to_dict(member, AdminRepository.get_member_activity_counts(member.id))

    @staticmethod
    def _get_mutable_member(member_id, admin_member_id):
        member = AdminRepository.get_member_by_id(member_id)
        if not member:
            raise ValueError("Member not found")
        if member.id == admin_member_id:
            raise ValueError("Administrators cannot change their own role or status")
        return member

    @staticmethod
    def _normalize_role(role):
        normalized_role = str(role or "").lower()
        if normalized_role not in AdminService.ROLES:
            raise ValueError("Invalid member role")
        return normalized_role

    @staticmethod
    def _normalize_status(status):
        normalized_status = str(status or "").lower()
        if normalized_status not in AdminService.STATUSES:
            raise ValueError("Invalid member status")
        return normalized_status

    @staticmethod
    def _status_update_data(status):
        if status == "active":
            return {"status": status, "active": True, "deleted_at": None}
        if status == "withdrawn":
            return {"status": status, "active": False, "deleted_at": datetime.now(timezone.utc)}
        return {"status": status, "active": False, "deleted_at": None}

    @staticmethod
    def _create_audit_log(admin_member_id, action_type, member_id, before, after):
        AdminRepository.create_audit_log(
            {
                "admin_member_id": admin_member_id,
                "action_type": action_type,
                "target_table": "members",
                "target_id": member_id,
                "before_json": before,
                "after_json": after,
            }
        )
