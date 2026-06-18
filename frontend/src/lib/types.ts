export type Language = "ko" | "en"
export type HospitalCategory = "derma" | "eye" | "dental"
export type UserRole = "USER" | "ADMIN"
export type UserStatus = "ACTIVE" | "SUSPENDED" | "WITHDRAWN"
export type SocialProvider = "google" | "naver" | "kakao"

export type AnalysisHistoryItem = {
  id: string
  hospitalName: string
  category: HospitalCategory
  score: number
  foreignerFriendlyScore?: number
  createdAt: string
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
  name: string
  phone?: string
  role: UserRole
  status: UserStatus
  provider?: "local" | SocialProvider
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
  email: string
  password: string
  nickname: string
  termsAgreed: boolean
  privacyAgreed: boolean
  marketingAgreed: boolean
}

export interface SignupRequest extends SignupPayload {
  passwordConfirm?: string
  name?: string
  phone?: string
}

export interface LoginResponse {
  user: User
}

export interface FindIdRequest {
  name: string;
  phone: string;
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
}

export interface WithdrawalRequest {
  password?: string
  reason?: string
}

export interface UpdateProfilePayload {
  nickname: string
  password?: string
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
}
