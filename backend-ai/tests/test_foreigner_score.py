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
    def test_accepts_orthopedics_category_from_backend_main(self):
        payload = make_payload(category="orthopedics")

        self.assertEqual(payload.category, "orthopedics")

    def test_accepts_orthopedics_aliases(self):
        self.assertEqual(make_payload(category="orthopedic").category, "orthopedic")
        self.assertEqual(make_payload(category="정형외과").category, "정형외과")

    def test_pasted_review_text_is_split_by_blank_lines(self):
        payload = make_payload(
            reviews=[],
            reviewText="상담과 비용 안내가 자세했어요.\n\n대기 시간과 진료 과정을 설명받았어요.",
        )

        self.assertEqual(OpenAIReviewAnalysisService.analyzed_review_count(payload), 2)

    def test_reviews_array_is_preferred_over_merged_review_text(self):
        payload = make_payload(
            reviewText="상담과 비용 안내가 자세했어요.\n\n대기 시간과 진료 과정을 설명받았어요.",
            reviews=[
                "상담과 비용 안내가 자세했어요.",
                "대기 시간과 진료 과정을 설명받았어요.",
            ],
        )

        self.assertEqual(OpenAIReviewAnalysisService.analyzed_review_count(payload), 2)

    def test_owner_reply_block_is_removed_from_review_text(self):
        payload = make_payload(
            reviews=[
                "상담과 비용 안내가 자세했어요.\n병원 답변\n소중한 리뷰 감사합니다. 더 좋은 진료로 보답하겠습니다.",
            ],
        )

        self.assertEqual(OpenAIReviewAnalysisService._review_texts(payload), ["상담과 비용 안내가 자세했어요."])

    def test_patient_sentence_about_missing_reply_is_kept(self):
        payload = make_payload(
            reviews=["병원 답변이 없어서 예약 문의가 불편했어요."],
        )

        self.assertEqual(OpenAIReviewAnalysisService._review_texts(payload), ["병원 답변이 없어서 예약 문의가 불편했어요."])

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

    def test_exact_negative_english_guidance_sentence_is_not_confirmed(self):
        payload = make_payload(reviews=["상담은 좋았지만 영어 안내가 없어요."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["englishGuide"], "notConfirmed")

    def test_review_location_signal_confirms_map_location(self):
        payload = make_payload(reviews=["병원이 역에서 가까워서 찾아가기 쉬웠어요."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["mapLocation"], "confirmed")

    def test_multiple_positive_location_reviews_are_not_cancelled_by_one_negative(self):
        payload = make_payload(
            reviews=[
                "병원이 역에서 가까워요.",
                "위치가 좋아서 찾기 쉬웠어요.",
                "위치가 멀어서 찾아가기 어려웠어요.",
            ]
        )

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["mapLocation"], "confirmed")

    def test_review_booking_signal_confirms_contact_booking(self):
        payload = make_payload(reviews=["방문 전에 전화로 예약했고 안내를 받았습니다."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["contactBooking"], "confirmed")

    def test_homepage_only_does_not_confirm_contact_booking(self):
        payload = make_payload(homepageUrl="https://clinic.example.com")

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["contactBooking"], "unknown")
        self.assertEqual(checks["websitePlaceLink"], "confirmed")

    def test_failed_inquiry_does_not_confirm_booking(self):
        payload = make_payload(reviews=["병원에 문의했지만 답변을 받지 못했습니다."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["contactBooking"], "notConfirmed")

    def test_review_photo_signal_confirms_photo_information(self):
        payload = make_payload(reviews=["네이버 사진과 실제 내부가 비슷해서 방문 전에 참고하기 좋았어요."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["photoInfo"], "confirmed")

    def test_english_negative_guidance_sentence_is_not_confirmed(self):
        payload = make_payload(
            reviews=["The treatment was fine, but English support was not available."]
        )

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["englishGuide"], "notConfirmed")

    def test_generic_foreigner_mention_does_not_confirm_english_support(self):
        payload = make_payload(reviews=["I am a foreigner and visited this clinic."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["englishGuide"], "unknown")

    def test_no_foreign_patients_does_not_mean_no_english_support(self):
        payload = make_payload(reviews=["There were no foreign patients when I visited."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["englishGuide"], "unknown")

    def test_explicit_english_support_sentence_is_confirmed(self):
        payload = make_payload(reviews=["The doctor explained everything in English."])

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["englishGuide"], "confirmed")

    def test_explicit_no_english_support_is_not_overridden_by_review(self):
        payload = make_payload(
            hasEnglishInfo=False,
            reviews=["The doctor explained everything in English."],
        )

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
            phone="02-0000-0000",
        )

        self.assertEqual(OpenAIReviewAnalysisService.calculate_foreigner_score(payload), 100)

    def test_naver_place_confirms_map_and_place_link(self):
        payload = make_payload(naverPlaceUrl="https://map.naver.com/p/entry/place/123")

        checks = OpenAIReviewAnalysisService.global_accessibility_checks(payload)

        self.assertEqual(checks["mapLocation"], "confirmed")
        self.assertEqual(checks["websitePlaceLink"], "confirmed")
        self.assertEqual(checks["contactBooking"], "unknown")

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

    def test_place_metadata_does_not_change_review_trust_or_total_score(self):
        plain = make_payload(reviews=["상담이 자세했고 대기 시간과 비용을 안내받았어요."])
        enriched = make_payload(
            reviews=["상담이 자세했고 대기 시간과 비용을 안내받았어요."],
            hospitalName="예시피부과",
            address="서울시 강남구",
            phone="02-0000-0000",
            treatmentItems=["피부 상담", "시술"],
            description="예약과 진료 항목 안내가 있습니다.",
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

        self.assertGreater(enriched_result["placeScore"], plain_result["placeScore"])
        self.assertEqual(plain_result["reviewTrustScore"], enriched_result["reviewTrustScore"])
        self.assertEqual(plain_result["totalScore"], enriched_result["totalScore"])

    def test_promotional_and_repetitive_reviews_lower_review_trust_score(self):
        concrete_reviews = [
            f"상담 설명이 자세했고 비용 안내와 대기 시간 안내를 받았습니다. 방문 {index}번째 후기입니다."
            for index in range(1, 13)
        ]
        suspicious_reviews = [
            "무조건 추천합니다. 꼭 가세요. 협찬 느낌은 아니지만 이벤트 할인 무료 혜택이 계속 강조됐습니다."
            for _ in range(12)
        ]

        concrete_result = OpenAIReviewAnalysisService.normalize_response_data(
            self._base_ai_data(),
            make_payload(reviews=concrete_reviews),
            "test",
        )
        suspicious_result = OpenAIReviewAnalysisService.normalize_response_data(
            {
                **self._base_ai_data(),
                "repetitionLevel": "high",
                "repetitivePhrases": ["무조건 추천", "이벤트 할인"],
                "negativeSignals": ["반복 홍보 표현"],
            },
            make_payload(reviews=suspicious_reviews),
            "test",
        )

        self.assertGreater(suspicious_result["riskScore"], concrete_result["riskScore"])
        self.assertLess(suspicious_result["reviewTrustScore"], concrete_result["reviewTrustScore"])

    def test_event_discount_terms_are_not_double_counted_as_general_promo_signal(self):
        result = OpenAIReviewAnalysisService.normalize_response_data(
            self._base_ai_data(),
            make_payload(reviews=["이벤트 할인 무료 혜택 안내를 받았습니다." for _ in range(10)]),
            "test",
        )

        self.assertEqual(result["promoSignalScore"], 0)
        self.assertGreater(result["eventDiscountScore"], 0)

    def test_diversity_score_does_not_apply_repetition_penalty_again(self):
        reviews = ["상담 설명과 비용 안내가 비슷하게 반복된 후기입니다." for _ in range(8)]

        low_repetition_diversity = OpenAIReviewAnalysisService.calculate_diversity_score(
            reviews,
            repetition_score=0,
        )
        high_repetition_diversity = OpenAIReviewAnalysisService.calculate_diversity_score(
            reviews,
            repetition_score=100,
        )

        self.assertEqual(low_repetition_diversity, high_repetition_diversity)

    def test_few_reviews_cap_review_trust_score(self):
        result = OpenAIReviewAnalysisService.normalize_response_data(
            {
                **self._base_ai_data(),
                "trustScore": 100,
                "adScore": 0,
                "informationScore": 100,
                "positiveSignals": ["구체적인 상담", "비용 안내", "대기 시간 안내"],
            },
            make_payload(reviews=["상담, 비용, 대기 시간, 예약 방법을 자세히 안내받았습니다."]),
            "test",
        )

        self.assertLessEqual(result["reviewTrustScore"], 60)

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
