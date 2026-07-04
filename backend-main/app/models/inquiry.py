from app.extensions import db


class Inquiry(db.Model):
    __tablename__ = "inquiries"
    __table_args__ = (
        db.CheckConstraint(
            "category in ('ANALYSIS_RESULT', 'REVIEW_INPUT', 'ACCOUNT', 'PAYMENT', 'SUGGESTION', 'OTHER')",
            name="inquiries_category_check",
        ),
        db.CheckConstraint(
            "status in ('PENDING', 'IN_PROGRESS', 'ANSWERED')",
            name="inquiries_status_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="CASCADE"),
        nullable=False,
    )
    category = db.Column(db.String(40), nullable=False)
    sub_category = db.Column(db.String(120))
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), nullable=False, default="PENDING", server_default="PENDING")
    related_analysis_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.analysis_requests.id", ondelete="SET NULL"),
    )
    attachment_url = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="inquiries")
    related_analysis = db.relationship("AnalysisRequest", back_populates="inquiries")
    answers = db.relationship(
        "InquiryAnswer",
        back_populates="inquiry",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="InquiryAnswer.created_at.desc()",
    )

    def __repr__(self):
        return f"<Inquiry id={self.id} status={self.status}>"
