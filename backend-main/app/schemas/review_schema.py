def _isoformat(value):
    return value.isoformat() if value else None


REVIEW_FIELDS = {
    "member_id",
    "hospital_id",
    "request_id",
    "review_original",
    "review_language",
    "review_translated_ko",
    "review_translated_en",
    "source_platform",
}


def review_to_dict(review):
    if review is None:
        return None

    return {
        "id": review.id,
        "member_id": review.member_id,
        "hospital_id": review.hospital_id,
        "request_id": review.request_id,
        "review_original": review.review_original,
        "review_language": review.review_language,
        "review_translated_ko": review.review_translated_ko,
        "review_translated_en": review.review_translated_en,
        "source_platform": review.source_platform,
        "created_at": _isoformat(review.created_at),
    }


def extract_review_data(payload):
    return {
        key: payload[key]
        for key in REVIEW_FIELDS
        if key in payload
    }
