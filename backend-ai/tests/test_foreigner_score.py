import unittest

from app.schemas.review_analysis_schema import ReviewAnalyzeRequest
from app.services.openai_review_analysis_service import OpenAIReviewAnalysisService


def make_payload(**kwargs):
    return ReviewAnalyzeRequest(
        category="dermatology",
        reviews=["친절하고 설명이 자세했어요."],
        **kwargs,
    )


class ForeignerScoreTest(unittest.TestCase):
    def test_foreigner_score_accepts_user_photo_info(self):
        payload = make_payload(hasPhotos=True)

        self.assertEqual(OpenAIReviewAnalysisService.calculate_foreigner_score(payload), 10)

    def test_foreigner_score_accepts_naver_map(self):
        payload = make_payload(naverPlaceUrl="https://map.naver.com/p/entry/place/123")

        self.assertEqual(OpenAIReviewAnalysisService.calculate_foreigner_score(payload), 35)

    def test_foreigner_score_accepts_kakao_map(self):
        payload = make_payload(kakaoPlaceUrl="https://place.map.kakao.com/123")

        self.assertEqual(OpenAIReviewAnalysisService.calculate_foreigner_score(payload), 35)

    def test_foreigner_score_full_metadata_is_100(self):
        payload = make_payload(
            googleMapUrl="https://maps.google.com/?cid=123",
            googlePlaceId="google-place-id",
            englishName="Example Dermatology Clinic",
            hasEnglishInfo=True,
            hasEnglishReviews=True,
            hasGooglePhotos=True,
            homepageUrl="https://clinic.example.com",
        )

        self.assertEqual(OpenAIReviewAnalysisService.calculate_foreigner_score(payload), 100)


if __name__ == "__main__":
    unittest.main()
