import unittest

from app.services.openai_review_analysis_service import OpenAIReviewAnalysisService


class TrustLevelBoundaryTest(unittest.TestCase):
    def test_trust_level_boundaries_match_frontend_standard(self):
        expected_levels = {
            85: "very_safe",
            84: "safe",
            70: "safe",
            69: "normal",
            50: "normal",
            49: "caution",
            30: "caution",
            29: "danger",
        }

        for score, expected in expected_levels.items():
            with self.subTest(score=score):
                self.assertEqual(OpenAIReviewAnalysisService.trust_level_key(score), expected)

    def test_trust_grade_uses_review_flow_wording(self):
        self.assertEqual(OpenAIReviewAnalysisService.trust_grade("safe", "ko"), "참고 가능")
        self.assertEqual(OpenAIReviewAnalysisService.trust_grade("safe", "en"), "Useful reference")


if __name__ == "__main__":
    unittest.main()
