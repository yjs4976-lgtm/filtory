from app.extensions import db


class InquiryAnswer(db.Model):
    __tablename__ = "inquiry_answers"
    __table_args__ = ({"schema": "public"},)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    inquiry_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.inquiries.id", ondelete="CASCADE"),
        nullable=False,
    )
    admin_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="SET NULL"),
    )
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    inquiry = db.relationship("Inquiry", back_populates="answers")
    admin = db.relationship("Member", foreign_keys=[admin_id])

    def __repr__(self):
        return f"<InquiryAnswer id={self.id} inquiry_id={self.inquiry_id}>"
