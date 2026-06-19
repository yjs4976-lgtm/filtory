from app.extensions import db


class Member(db.Model):
    __tablename__ = "members"
    __table_args__ = (
        db.CheckConstraint("role in ('user', 'admin')", name="members_role_check"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True)
    password_hash = db.Column(db.Text)
    nickname = db.Column(db.String(100))
    real_name = db.Column(db.String(100))
    phone = db.Column(db.String(50))
    profile_img_url = db.Column(db.Text)
    role = db.Column(db.String(30), nullable=False, default="user", server_default="user")
    active = db.Column(db.Boolean, nullable=False, default=True, server_default=db.text("true"))
    email_verified = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    last_login_at = db.Column(db.DateTime(timezone=True))
    password_changed_at = db.Column(db.DateTime(timezone=True))
    deleted_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    social_accounts = db.relationship(
        "SocialAccount",
        back_populates="member",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    password_reset_tokens = db.relationship(
        "PasswordResetToken",
        back_populates="member",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reviews = db.relationship("Review", back_populates="member")
    analysis_requests = db.relationship("AnalysisRequest", back_populates="member")
    analysis_results = db.relationship("AnalysisResult", back_populates="member")
    subscriptions = db.relationship(
        "MemberSubscription",
        back_populates="member",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    admin_audit_logs = db.relationship("AdminAuditLog", back_populates="admin_member")
    submitted_reports = db.relationship(
        "ReviewReport",
        foreign_keys="ReviewReport.reporter_member_id",
        back_populates="reporter_member",
    )
    assigned_reports = db.relationship(
        "ReviewReport",
        foreign_keys="ReviewReport.admin_member_id",
        back_populates="admin_member",
    )

    def __repr__(self):
        return f"<Member id={self.id} email={self.email}>"
