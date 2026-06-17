from app.extensions import db


class Hospital(db.Model):
    __tablename__ = "hospitals"
    __table_args__ = (
        db.CheckConstraint(
            "category in ('dermatology', 'ophthalmology', 'dentistry')",
            name="hospitals_category_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    hospital_name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(30), nullable=False)
    naver_place_url = db.Column(db.Text)
    naver_place_id = db.Column(db.String(100))
    google_map_url = db.Column(db.Text)
    google_place_id = db.Column(db.String(255))
    address = db.Column(db.Text)
    phone = db.Column(db.String(50))
    homepage_url = db.Column(db.Text)
    description = db.Column(db.Text)
    treatment_items = db.Column(db.Text)
    has_photos = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    has_videos = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    has_reservation_link = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    google_registered = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    english_name = db.Column(db.String(255))
    has_english_info = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    has_english_reviews = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    operating_hours = db.Column(db.Text)
    reservation_url = db.Column(db.Text)
    naver_rating = db.Column(db.Numeric(3, 2))
    naver_review_count = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    google_rating = db.Column(db.Numeric(3, 2))
    google_review_count = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    has_google_photos = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    reviews = db.relationship(
        "Review",
        back_populates="hospital",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    analysis_requests = db.relationship(
        "AnalysisRequest",
        back_populates="hospital",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    analysis_results = db.relationship(
        "AnalysisResult",
        back_populates="hospital",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reports = db.relationship(
        "ReviewReport",
        back_populates="hospital",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        return f"<Hospital id={self.id} hospital_name={self.hospital_name}>"
