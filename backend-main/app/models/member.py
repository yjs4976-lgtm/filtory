from app.extensions import db


class Member(db.Model):
    # db.Model을 상속하면 SQLAlchemy가 이 클래스를 members 테이블과 매핑한다.
    __tablename__ = "members"
    __table_args__ = (
        # CheckConstraint는 DB 레벨에서 허용 값 범위를 한 번 더 제한한다.
        db.CheckConstraint("role in ('user', 'admin')", name="members_role_check"),
        db.CheckConstraint(
            "status in ('active', 'suspended', 'withdrawn', 'dormant')",
            name="members_status_check",
        ),
        {"schema": "public"},
    )

    # db.Column은 실제 테이블 컬럼 정의다. Python attribute 이름이 기본 컬럼명이 된다.
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    login_id = db.Column(db.String(20))
    email = db.Column(db.String(255), unique=True)
    password_hash = db.Column(db.Text)
    nickname = db.Column(db.String(100))
    real_name = db.Column(db.String(100))
    phone = db.Column(db.String(30))
    profile_img_url = db.Column(db.Text)
    role = db.Column(db.String(30), nullable=False, default="user", server_default="user")
    status = db.Column(db.String(30), nullable=False, default="active", server_default="active")
    active = db.Column(db.Boolean, nullable=False, default=True, server_default=db.text("true"))
    email_verified = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    last_login_at = db.Column(db.DateTime(timezone=True))
    password_changed_at = db.Column(db.DateTime(timezone=True))
    deleted_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    # relationship은 외래키로 연결된 다른 모델을 Python 객체처럼 접근하게 해준다.
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
    email_verification_tokens = db.relationship(
        "EmailVerificationToken",
        back_populates="member",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reviews = db.relationship("Review", back_populates="member")
    analysis_requests = db.relationship(
        "AnalysisRequest",
        back_populates="member",
        foreign_keys="AnalysisRequest.member_id",
    )
    analysis_results = db.relationship("AnalysisResult", back_populates="member")
    subscriptions = db.relationship(
        "MemberSubscription",
        back_populates="member",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    terms_agreements = db.relationship(
        "MemberTermsAgreement",
        back_populates="member",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    saved_hospitals = db.relationship(
        "MemberSavedHospital",
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
    inquiries = db.relationship(
        "Inquiry",
        back_populates="member",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    notifications = db.relationship(
        "MemberNotification",
        back_populates="member",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        return f"<Member id={self.id} email={self.email}>"
