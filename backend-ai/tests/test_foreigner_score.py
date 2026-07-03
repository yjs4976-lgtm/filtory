import unittest

from app.schemas.review_analysis_schema import ReviewAnalyzeRequest
from app.services.openai_review_analysis_service import OpenAIReviewAnalysisService


def make_payload(**kwargs):
    data = {
        "category": "dermatology",
        "reviews": ["친절하고 설명이 자세했어요."],
    }
    data.update(kwargs)
    return ReviewAnalyzeRequest(**data)


class ForeignerScoreTest(unittest.TestCase):
    def test_empty_metadata_returns_unknown_checks(self):
        payload = make_payload()

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertTrue(checks)
        self.assertTrue(all(status == "unknown" for status in checks.values()))

    def test_explicit_false_returns_not_confirmed(self):
        payload = make_payload(
            googleRegistered=False,
            hasPhotos=False,
            hasGooglePhotos=False,
            hasEnglishInfo=False,
            hasEnglishReviews=False,
            englishName="",
        )

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["mapLocation"], "notConfirmed")
        self.assertEqual(checks["photoInfo"], "notConfirmed")
        self.assertEqual(checks["englishGuide"], "notConfirmed")
        self.assertEqual(checks["englishReviews"], "notConfirmed")
        self.assertEqual(checks["englishName"], "notConfirmed")

    def test_negative_english_sentence_is_not_confirmed(self):
        payload = make_payload(reviews=["진료는 괜찮았지만 영어 안내가 없었어요. 통역은 불가능합니다."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["englishGuide"], "notConfirmed")

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

    def test_naver_place_confirms_map_and_place_link(self):
        payload = make_payload(naverPlaceUrl="https://map.naver.com/p/entry/place/123")

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["mapLocation"], "confirmed")
        self.assertEqual(checks["websitePlaceLink"], "confirmed")
        self.assertEqual(checks["contactBooking"], "notConfirmed")

    def test_photo_info_distinguishes_unknown_and_explicit_false(self):
        unknown_payload = make_payload()
        false_payload = make_payload(hasPhotos=False)

        unknown_checks = OpenAIReviewAnalysisService.global_accessibility_checks(unknown_payload)
        false_checks = OpenAIReviewAnalysisService.global_accessibility_checks(false_payload)

        self.assertEqual(unknown_checks["photoInfo"], "unknown")
        self.assertEqual(false_checks["photoInfo"], "notConfirmed")

    def test_review_trust_does_not_change_with_convenience_metadata(self):
        plain = make_payload(reviews=["상담이 자세했고 대기 시간도 안내받았어요."])
        enriched = make_payload(
            reviews=["상담이 자세했고 대기 시간도 안내받았어요."],
            googleMapUrl="https://maps.google.com/?cid=123",
            englishName="Example Clinic",
            hasEnglishInfo=True,
            hasEnglishReviews=True,
            hasGooglePhotos=True,
            homepageUrl="https://clinic.example.com",
        )

        plain_result = OpenAIReviewAnalysisService.normalize_response_data(
            self._base_ai_data(),
            plain,
            "test",
        )
        enriched_result = OpenAIReviewAnalysisService.normalize_response_data(
            self._base_ai_data(),
            enriched,
            "test",
        )

        self.assertEqual(plain_result["reviewTrustScore"], enriched_result["reviewTrustScore"])

    def test_total_score_does_not_change_with_convenience_metadata(self):
        plain = make_payload(reviews=["상담이 자세했고 대기 시간도 안내받았어요."])
        enriched = make_payload(
            reviews=["상담이 자세했고 대기 시간도 안내받았어요."],
            naverPlaceUrl="https://map.naver.com/p/entry/place/123",
            englishName="Example Clinic",
            hasEnglishInfo=True,
            hasEnglishReviews=True,
            hasPhotos=True,
            homepageUrl="https://clinic.example.com",
        )

        plain_result = OpenAIReviewAnalysisService.normalize_response_data(
            self._base_ai_data(),
            plain,
            "test",
        )
        enriched_result = OpenAIReviewAnalysisService.normalize_response_data(
            self._base_ai_data(),
            enriched,
            "test",
        )

        self.assertEqual(plain_result["totalScore"], enriched_result["totalScore"])

    @staticmethod
    def _base_ai_data():
        return {
            "trustScore": 80,
            "adScore": 20,
            "informationScore": 70,
            "informationLevel": "구체적",
            "summary": "상담과 대기 정보가 포함된 리뷰입니다.",
            "recommendation": "방문 전 최신 정보를 확인해 보세요.",
            "visitTip": "예약 전 진료 항목을 확인해 보세요.",
            "positiveSignals": ["상담 설명"],
            "negativeSignals": [],
            "suspiciousPhrases": [],
            "repetitivePhrases": [],
            "detectedPatterns": [],
        }


if __name__ == "__main__":
    unittest.main()
