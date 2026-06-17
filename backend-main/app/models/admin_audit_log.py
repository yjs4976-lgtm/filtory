from app.extensions import db


class AdminAuditLog(db.Model):
    __tablename__ = "admin_audit_logs"
    __table_args__ = (
        db.CheckConstraint(
            """action_type in (
              'member_update',
              'member_deactivate',
              'hospital_create',
              'hospital_update',
              'hospital_delete',
              'review_update',
              'review_delete',
              'analysis_review',
              'report_resolve',
              'subscription_update',
              'login'
            )""",
            name="admin_audit_logs_action_type_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    admin_member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    action_type = db.Column(db.String(50), nullable=False)
    target_table = db.Column(db.String(50))
    target_id = db.Column(db.BigInteger)
    description = db.Column(db.Text)
    before_json = db.Column(db.JSON)
    after_json = db.Column(db.JSON)
    request_ip = db.Column(db.String(100))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    admin_member = db.relationship("Member", back_populates="admin_audit_logs")

    def __repr__(self):
        return f"<AdminAuditLog id={self.id} action_type={self.action_type}>"
