from app.extensions import db


class Review(db.Model):
    __tablename__ = "reviews"
    __table_args__ = (
        db.CheckConstraint("review_language in ('ko', 'en', 'unknown')", name="reviews_language_check"),
        db.CheckConstraint(
            "source_platform in ('user_input', 'naver_place', 'google_map', 'manual')",
            name="reviews_source_platform_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    hospital_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.hospitals.id", ondelete="CASCADE"),
        nullable=False,
    )
    request_id = db.Column(db.BigInteger, db.ForeignKey("public.analysis_requests.id", ondelete="CASCADE"))
    review_original = db.Column(db.Text, nullable=False)
    review_language = db.Column(db.String(20), nullable=False, default="ko", server_default="ko")
    review_translated_ko = db.Column(db.Text)
    review_translated_en = db.Column(db.Text)
    source_platform = db.Column(
        db.String(30),
        nullable=False,
        default="user_input",
        server_default="user_input",
    )
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="reviews")
    hospital = db.relationship("Hospital", back_populates="reviews")
    analysis_request = db.relationship("AnalysisRequest", back_populates="reviews")
    analysis_results = db.relationship(
        "AnalysisResult",
        back_populates="review",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reports = db.relationship(
        "ReviewReport",
        back_populates="review",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    admin_moderation_cases = db.relationship(
        "AdminReviewModerationCase",
        back_populates="review",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        return f"<Review id={self.id} hospital_id={self.hospital_id}>"
