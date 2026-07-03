from app.extensions import db
from app.models import HospitalEnrichmentSuggestion


class HospitalEnrichmentSuggestionRepository:
    @staticmethod
    def create(data):
        suggestion = HospitalEnrichmentSuggestion(**data)
        db.session.add(suggestion)
        return suggestion
