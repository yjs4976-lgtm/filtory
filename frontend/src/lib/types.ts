export type Language = "ko" | "en"
export type HospitalCategory = "derma" | "eye" | "dental"
export type UserRole = "USER" | "ADMIN"
export type UserStatus = "ACTIVE" | "SUSPENDED" | "WITHDRAWN" | "DORMANT"
export type SocialProvider = "google" | "naver" | "kakao"

export type AnalysisHistoryItem = {
  id: string
  hospitalName: string
  category: HospitalCategory
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
  email: string
  password: string
}

export interface SignupPayload {
  name: string
  email: string
  password: string
  nickname: string
  termsAgreed: boolean
  privacyAgreed: boolean
  marketingAgreed?: boolean
}

export interface SignupRequest extends SignupPayload {
  passwordConfirm?: string
  phone?: string
}

export interface LoginResponse {
  user: User
}

export interface FindIdRequest {
  name?: string;
  nickname?: string;
}

export interface FindIdResponse {
  email: string;
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
  nickname?: string
  password?: string
  profileImageUrl?: string | null
}

export interface WithdrawPayload {
  password: string
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
