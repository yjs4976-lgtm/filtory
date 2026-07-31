// TODO: Replace admin mock data with API response.
import type { Gender } from "@/lib/types"
export type UserRole = "USER" | "ADMIN"
export type Department = "피부과" | "안과" | "치과" | "정형외과"
export const ADMIN_DEPARTMENTS: Department[] = ["피부과", "안과", "치과", "정형외과"]

export type AdminMockUser = {
  id: string; name: string; email: string; role: UserRole; plan: "Free" | "Plus"
  accountStatus: "정상" | "정지" | "탈퇴"; membershipStatus: "이용 중" | "결제 대기" | "해지 예정" | "만료" | "결제 실패"
  monthlyLimit: number; usedCount: number; rewardCount: number; adminGrantedCount?: number; joinedAt: string; lastLoginAt: string
  hasPaymentHistory: boolean; nextBillingDate?: string
  dateOfBirth?: string | null; gender?: Gender | null
}

export const ADMIN_USERS: AdminMockUser[] = [
  { id:"U-1048",name:"조정화",email:"jo***@email.com",role:"USER",plan:"Free",accountStatus:"정상",membershipStatus:"이용 중",monthlyLimit:5,usedCount:1,rewardCount:0,joinedAt:"2026-01-18",lastLoginAt:"2026-07-16 09:42",hasPaymentHistory:false,dateOfBirth:"1997-08-20",gender:"FEMALE" },
  { id:"U-1047",name:"김민서",email:"mi***@mail.com",role:"USER",plan:"Free",accountStatus:"정상",membershipStatus:"이용 중",monthlyLimit:5,usedCount:4,rewardCount:0,joinedAt:"2026-02-03",lastLoginAt:"2026-07-16 08:21",hasPaymentHistory:false,dateOfBirth:"2000-12-31",gender:null },
  { id:"U-1046",name:"박도윤",email:"do***@mail.com",role:"USER",plan:"Free",accountStatus:"정상",membershipStatus:"이용 중",monthlyLimit:5,usedCount:5,rewardCount:0,joinedAt:"2026-02-21",lastLoginAt:"2026-07-15 22:10",hasPaymentHistory:false,dateOfBirth:null,gender:"MALE" },
  { id:"U-1045",name:"이서연",email:"se***@email.com",role:"USER",plan:"Free",accountStatus:"정상",membershipStatus:"이용 중",monthlyLimit:5,usedCount:5,rewardCount:1,joinedAt:"2026-03-12",lastLoginAt:"2026-07-15 19:03",hasPaymentHistory:false,dateOfBirth:null,gender:null },
  { id:"U-1044",name:"최현우",email:"hy***@mail.com",role:"USER",plan:"Plus",accountStatus:"정상",membershipStatus:"이용 중",monthlyLimit:30,usedCount:8,rewardCount:0,joinedAt:"2025-12-08",lastLoginAt:"2026-07-16 10:04",hasPaymentHistory:true,nextBillingDate:"2026-08-16",dateOfBirth:"1992-02-29",gender:"PREFER_NOT_TO_SAY" },
  { id:"U-1043",name:"정하은",email:"ha***@email.com",role:"USER",plan:"Plus",accountStatus:"정상",membershipStatus:"해지 예정",monthlyLimit:30,usedCount:16,rewardCount:0,joinedAt:"2025-11-24",lastLoginAt:"2026-07-14 18:44",hasPaymentHistory:true,nextBillingDate:"2026-07-31" },
  { id:"U-1042",name:"강지훈",email:"ji***@mail.com",role:"USER",plan:"Free",accountStatus:"정지",membershipStatus:"이용 중",monthlyLimit:5,usedCount:2,rewardCount:0,joinedAt:"2026-04-02",lastLoginAt:"2026-07-10 11:25",hasPaymentHistory:false },
  { id:"U-1041",name:"윤수아",email:"su***@email.com",role:"USER",plan:"Plus",accountStatus:"정상",membershipStatus:"결제 대기",monthlyLimit:30,usedCount:3,rewardCount:0,joinedAt:"2026-04-19",lastLoginAt:"2026-07-16 07:51",hasPaymentHistory:true,nextBillingDate:"2026-08-02" },
  { id:"U-1040",name:"한예준",email:"ye***@mail.com",role:"USER",plan:"Free",accountStatus:"탈퇴",membershipStatus:"만료",monthlyLimit:5,usedCount:0,rewardCount:0,joinedAt:"2026-01-30",lastLoginAt:"2026-06-28 13:12",hasPaymentHistory:false },
  { id:"U-1039",name:"임지아",email:"ji***@email.com",role:"ADMIN",plan:"Plus",accountStatus:"정상",membershipStatus:"이용 중",monthlyLimit:30,usedCount:11,rewardCount:0,joinedAt:"2025-10-10",lastLoginAt:"2026-07-16 10:18",hasPaymentHistory:true,nextBillingDate:"2026-08-10" },
  { id:"U-1038",name:"오가은",email:"ga***@email.com",role:"USER",plan:"Free",accountStatus:"정상",membershipStatus:"이용 중",monthlyLimit:5,usedCount:3,rewardCount:0,joinedAt:"2026-05-11",lastLoginAt:"2026-07-15 16:20",hasPaymentHistory:false },
  { id:"U-1037",name:"서준호",email:"ju***@mail.com",role:"USER",plan:"Free",accountStatus:"정상",membershipStatus:"이용 중",monthlyLimit:5,usedCount:5,rewardCount:1,joinedAt:"2026-05-27",lastLoginAt:"2026-07-14 12:08",hasPaymentHistory:false },
]

export const ADMIN_KPIS = [
  ["전체 사용자","1,248명","지난달보다 8.4% 증가"], ["이번 달 활성 사용자","684명","지난달보다 5.1% 증가"],
  ["Free 이용자","1,161명","전체 사용자의 93.0%"], ["Plus 이용자","87명","전체 사용자의 7.0%"],
  ["오늘 분석 건수","126건","어제보다 3.2% 증가"], ["이번 달 분석 건수","2,941건","지난달 같은 기간보다 12.6% 증가"],
] as const
export const WEEKLY_USAGE = [{day:"월",value:82},{day:"화",value:104},{day:"수",value:97},{day:"목",value:131},{day:"금",value:145},{day:"토",value:118},{day:"일",value:126}]
export const RECENT_ACTIVITY = [
  ["U-1048 · jo***@email.com","병원명 검색","피부과","오늘 10:21","완료"], ["U-1044 · hy***@mail.com","URL 분석","안과","오늘 10:04","완료"],
  ["U-1047 · mi***@mail.com","병원명 검색","치과","오늘 09:52","분석 중"], ["U-1042 · ji***@mail.com","URL 분석","정형외과","오늘 09:31","실패"],
] as const

export const DASHBOARD_ACTIVITY = [
  { id:"A-2941",department:"피부과" as Department,method:"병원명 검색",email:"jo***@email.com",detail:"신뢰도 78점 · 광고 의심 5개",time:"10:28",status:"완료" },
  { id:"A-2940",department:"치과" as Department,method:"URL 분석",email:"su***@email.com",detail:"신뢰도 71점 · 광고 의심 4개",time:"10:22",status:"완료" },
  { id:"A-2939",department:"정형외과" as Department,method:"URL 분석",email:"ki***@email.com",detail:"URL 접근 실패",time:"10:15",status:"실패" },
  { id:"A-2938",department:"안과" as Department,method:"병원명 검색",email:"pa***@email.com",detail:"분석 처리 중",time:"09:58",status:"분석 중" },
  { id:"A-2937",department:"정형외과" as Department,method:"병원명 검색",email:"le***@email.com",detail:"신뢰도 82점 · 광고 의심 3개",time:"09:47",status:"완료" },
]
export const DEPARTMENT_USAGE = [{name:"피부과" as Department,count:312,errors:3},{name:"안과" as Department,count:184,errors:1},{name:"치과" as Department,count:167,errors:2},{name:"정형외과" as Department,count:140,errors:3}]
export const ANALYSIS_RECORDS = [
  {id:"A-2941",user:"조정화 · U-1048",method:"병원명 검색",department:"피부과" as Department,score:78,suspicious:5,time:"2026-07-16 10:28",duration:"7.8초",status:"완료",input:"라벤더피부과",reported:false},
  {id:"A-2940",user:"윤수아 · U-1041",method:"URL 분석",department:"치과" as Department,score:71,suspicious:4,time:"2026-07-16 10:22",duration:"9.2초",status:"검토 필요",input:"https://example.com/review/2940",reported:true},
  {id:"A-2939",user:"김민서 · U-1047",method:"URL 분석",department:"정형외과" as Department,score:0,suspicious:0,time:"2026-07-16 10:15",duration:"3.1초",status:"실패",input:"https://example.com/review/2939",reported:false},
  {id:"A-2938",user:"박도윤 · U-1046",method:"병원명 검색",department:"안과" as Department,score:0,suspicious:0,time:"2026-07-16 09:58",duration:"-",status:"분석 중",input:"맑은안과",reported:false},
]
export const ERROR_RECORDS = [
  {id:"E-109",user:"김민서 · U-1047",method:"URL 분석",department:"정형외과" as Department,input:"https://example.com/review/2939",type:"URL 접근 실패",time:"2026-07-16 10:15",retries:1,status:"처리 대기"},
  {id:"E-108",user:"강지훈 · U-1042",method:"URL 분석",department:"피부과" as Department,input:"https://invalid.example",type:"지원하지 않는 URL",time:"2026-07-16 09:31",retries:0,status:"확인 중"},
  {id:"E-107",user:"오가은 · U-1038",method:"병원명 검색",department:"치과" as Department,input:"화이트치과",type:"AI 분석 시간 초과",time:"2026-07-15 18:44",retries:2,status:"재시도 중"},
  {id:"E-106",user:"서준호 · U-1037",method:"병원명 검색",department:"안과" as Department,input:"봄빛안과",type:"결과 저장 실패",time:"2026-07-15 17:02",retries:1,status:"처리 완료"},
]

export const USAGE_RECORDS = [
  ["A-2941","U-1048","병원명 검색","피부과","무료 기본 횟수","2026-07-16 10:21","완료"],
  ["A-2940","U-1044","URL 분석","안과","Plus 횟수","2026-07-16 10:04","완료"],
  ["A-2939","U-1045","병원명 검색","치과","광고 보상 횟수","2026-07-16 09:52","분석 중"],
  ["A-2938","U-1042","URL 분석","정형외과","관리자 추가 횟수","2026-07-16 09:31","실패"],
] as const
export const AD_REWARDS = [["이서연 · U-1045","2026-07-15 18:22","1회","사용","2026-07-16 09:52","사용 완료"],["김민서 · U-1047","2026-07-14 20:10","1회","미사용","-","지급 완료"],["박도윤 · U-1046","2026-07-13 12:05","1회","-","-","지급 실패"]] as const
