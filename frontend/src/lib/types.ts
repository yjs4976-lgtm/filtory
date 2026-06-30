export type Language = "ko" | "en"
export type HospitalCategory = "derma" | "eye" | "dental"
export type HospitalRegionCode =
  | "seoul"
  | "gyeonggi"
  | "incheon"
  | "busan"
  | "daegu"
  | "daejeon"
  | "gwangju"
  | "ulsan"
  | "sejong"
  | "gangwon"
  | "chungbuk"
  | "chungnam"
  | "jeonbuk"
  | "jeonnam"
  | "gyeongbuk"
  | "gyeongnam"
  | "jeju"
export type UserRole = "USER" | "ADMIN"
export type UserStatus = "ACTIVE" | "SUSPENDED" | "WITHDRAWN" | "DORMANT"
export type SocialProvider = "google" | "naver" | "kakao"

export type AnalysisHistoryItem = {
  id: string
  userId?: string | number
  hospitalName: string
  hospitalNameKo?: string
  hospitalNameEn?: string
  hospitalEnglishName?: string
  category: HospitalCategory
  hospitalCategory?: HospitalCategory | string
  hospitalAddress?: string
  hospitalInfo?: string
  region?: string
  sourceName?: string
  sourceUrl?: string
  score: number
  foreignerFriendlyScore?: number
  createdAt: string
  analyzedAt?: string
  trustScore?: number
  trustLevel?: string
  adSuspicionScore?: number
  adSuspicionLevel?: string
  infoCompletenessScore?: number
  globalAccessRating?: number
  reviewCount?: number
  selectedReviewCount?: number
  totalReviewCount?: number
  repetitivePatternLevel?: "low" | "medium" | "high"
  concreteExperienceLevel?: "low" | "medium" | "high"
  positiveRatio?: number
  negativeRatio?: number
  summary?: string
  suspiciousPhrases?: string[]
  trustworthyPhrases?: string[]
  detectedReasons?: string[]
  foreignAccessibilityStars?: number
  resultStatus?: "completed" | "pending" | "failed" | string
}

export type HospitalItem = {
  id: string
  name: string
  hospitalNameKo?: string
  hospitalNameEn?: string
  hospitalEnglishName?: string
  category: HospitalCategory
  region: HospitalRegionCode
  address: string
  phone?: string
  reviewCount?: number
  sourceName?: string
  sourceUrl?: string
  mapUrl?: string
  homepageUrl?: string
  description?: string
  imageUrl?: string
  treatmentItems?: string
  searchKeywords?: string[]
}

export type ReviewImageItem = {
  id: string
  reviewId: string
  imageUrl: string
  altText?: string
  sortOrder?: number
}

export type ReviewCommentItem = {
  id: string
  reviewId: string
  memberId?: string | number
  parentCommentId?: string
  authorName: string
  content: string
  likeCount: number
  dislikeCount: number
  userReaction?: "like" | "dislike"
  createdAt: string
  replies?: ReviewCommentItem[]
}

export type HospitalReviewItem = {
  id: string
  hospitalId: string
  memberId?: string | number
  rating?: number
  content: string
  visitDate?: string
  createdAt?: string
  sourceName?: string
  sourceUrl?: string
  trustSignal?: "high" | "medium" | "low"
  adSuspicion?: "low" | "medium" | "high"
  images?: ReviewImageItem[]
  comments?: ReviewCommentItem[]
}

export type ReviewAnalyzeRequest = {
  category: HospitalCategory
  hospitalName?: string
  reviewText?: string
  reviews?: string[]
  outputLanguage?: Language
}

export type ReviewAnalyzeResponse = {
  trustScore: number
  grade?: string
  trustGrade: string
  trustLevelKey: "veryHigh" | "high" | "caution" | "concern" | "veryConcern"
  adSuspicion: string
  adSuspicionLevel: "low" | "medium" | "high"
  repetitionLevel?: "low" | "medium" | "high"
  informationCompleteness?: "low" | "medium" | "high"
  positiveSignals?: string[]
  warningSignals?: string[]
  globalAccessibilityScore?: number
  globalAccessibilityMaxScore?: number
  globalAccessibilityChecks?: {
    googleMapLink?: boolean
    englishName?: boolean
    englishGuide?: boolean
    homepageOrBookingLink?: boolean
    photoInfo?: boolean
  }
  detectedPatterns: string[]
  suspiciousPhrases: string[]
  repetitivePhrases: string[]
  informationLevel: string
  summary: string
  recommendation: string
  modelVersion: string
}

export type CurrentReviewAnalysis = ReviewAnalyzeResponse & {
  id: string
  category: HospitalCategory
  hospitalName: string
  hospitalNameKo?: string
  hospitalNameEn?: string
  hospitalEnglishName?: string
  reviewText?: string
  analyzedAt: string
}

export type ForeignerFriendlyCheck = {
  googleMapLink: boolean
  englishName: boolean
  englishGuide: boolean
  reservationLink: boolean
  photoInfo: boolean
}

export type ForeignerFriendlyResult = {
  checkedCount: number
  score: number
  stars: number
  checkedItems: string[]
  missingItems: string[]
  message: string
}

export interface User {
  id: number | string
  email: string
  nickname: string
  name?: string
  phone?: string
  role: UserRole
  status: UserStatus
  provider?: "local" | SocialProvider
  profileImageUrl?: string | null
  socialProviders?: Partial<Record<SocialProvider, boolean>>
  emailVerified?: boolean
  hasPassword?: boolean
  joinedAt?: string
  lastLoginAt?: string
  lastActiveAt?: string
  analysisCount?: number
  savedHospitalCount?: number
  reportCount?: number
  profileCompletion?: number
  createdAt?: string
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface LoginRequest {
  identifier: string
  password: string
}

export interface SignupPayload {
  name: string
  phone: string
  email: string
  loginId: string
  password: string
  nickname?: string
  termsAgreed: boolean
  privacyAgreed: boolean
  marketingAgreed?: boolean
}

export interface SignupRequest extends SignupPayload {
  passwordConfirm?: string
}

export interface LoginResponse {
  user: User
}

export interface FindIdRequest {
  name: string
  phone: string
}

export interface FindIdResponse {
  id: string
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  passwordConfirm: string;
}

export interface UpdateProfileRequest {
  name?: string
  nickname?: string
  phone?: string
  password?: string
  profileImageUrl?: string | null
}

export interface WithdrawalRequest {
  password?: string
  reason?: string
}

export interface UpdateProfilePayload {
  name?: string
  email?: string
  nickname?: string
  phone?: string
  password?: string
  profileImageUrl?: string | null
}

export interface WithdrawPayload {
  password: string
  reason?: string
}

export interface TermsAgreementState {
  termsAgreed: boolean
  privacyAgreed: boolean
  marketingAgreed: boolean
}

export interface AdminSummary {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  withdrawnUsers: number;
}

export interface AdminUser extends Omit<User, "id"> {
  id: number
  lastLoginAt?: string;
  analysisCount?: number
  savedHospitalCount?: number
  reportCount?: number
  memo?: string
}

export type SavedHospital = {
  id: number
  hospitalName: string
  category: HospitalCategory
  address: string
  trustScore: number
  trustLevel: string
  adSuspicionScore: number
  adSuspicionLevel: string
  infoCompletenessScore: number
  globalAccessRating: number
  savedAt: string
  lastAnalyzedAt?: string
}

export type CompareHospital = SavedHospital & {
  reviewCount: number
  recentReviewRatio: number
  negativeReviewRatio: number
  dentalMetrics?: {
    overtreatmentSuspicion: string
    priceMentionLevel: string
    explanationKindness: string
    revisitReviewLevel: string
    painMentionLevel: string
    waitingMentionLevel: string
  }
  eyeMetrics?: {
    examExplanation: string
    surgeryReviewTrust: string
    aftercareMention: string
    equipmentInfo: string
    waitingMentionLevel: string
    consultationSatisfaction: string
  }
  dermatologyMetrics?: {
    treatmentEffectReview: string
    adReviewSuspicion: string
    eventPhraseLevel: string
    consultationKindness: string
    revisitReviewLevel: string
    beforeAfterDetail: string
  }
}

export type CompareResult = {
  category: HospitalCategory
  hospitals: CompareHospital[]
  recommendedHospitalId?: number
  summary: string
}

export type MyReport = {
  id: number
  targetType: "review" | "hospital"
  hospitalName: string
  reason: string
  status: "RECEIVED" | "REVIEWING" | "COMPLETED" | "REJECTED"
  createdAt: string
  adminReply?: string
}

export type NotificationItem = {
  id: number
  title: string
  message: string
  type: "ANALYSIS" | "REPORT" | "SAVED_HOSPITAL" | "SECURITY"
  isRead: boolean
  createdAt: string
  link?: string
}

export type NotificationSettings = {
  analysisCompleted: boolean
  reportResult: boolean
  savedHospitalUpdated: boolean
  securityAlert: boolean
  marketing: boolean
}

export type RecentViewedHospital = {
  id: number
  hospitalName: string
  category: HospitalCategory
  address: string
  viewedAt: string
  trustLevel?: string
  globalAccessRating?: number
}

export type UserInsight = {
  mostAnalyzedCategory: HospitalCategory
  frequentArea: string
  savedHospitalAverageTrustLevel: string
  mainDecisionFactors: string[]
  summary: string
}

export type LoginHistory = {
  id: number
  loggedInAt: string
  method: string
  device: string
  location: string
}
