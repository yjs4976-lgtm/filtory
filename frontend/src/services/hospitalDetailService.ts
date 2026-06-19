import type { HospitalItem, HospitalReviewItem, ReviewCommentItem } from "@/lib/types"
import { getDemoHospitalById, getDemoReviewsForHospital } from "@/lib/mockHospitals"

const STORAGE_KEY = "filtory-hospital-reviews"
const COMMENT_STORAGE_KEY = "filtory-review-comments"

type StoredReviews = Record<string, HospitalReviewItem[]>
type StoredComments = Record<string, ReviewCommentItem[]>

function readStoredReviews(): StoredReviews {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStoredReviews(reviews: StoredReviews) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
}

function readStoredComments(): StoredComments {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(COMMENT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStoredComments(comments: StoredComments) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(COMMENT_STORAGE_KEY, JSON.stringify(comments))
}

function mergeReviewComments(baseComments: ReviewCommentItem[] = [], storedComments: ReviewCommentItem[] = []) {
  const clonedComments = baseComments.map((comment) => ({
    ...comment,
    replies: [...(comment.replies ?? [])],
  }))
  const commentMap = new Map<string, ReviewCommentItem>()

  function collect(comment: ReviewCommentItem) {
    commentMap.set(comment.id, comment)
    comment.replies?.forEach(collect)
  }

  clonedComments.forEach(collect)

  const topLevelStoredComments: ReviewCommentItem[] = []
  storedComments.forEach((comment) => {
    const nextComment = { ...comment, replies: [...(comment.replies ?? [])] }
    if (nextComment.parentCommentId) {
      const parentComment = commentMap.get(nextComment.parentCommentId)
      if (parentComment) {
        parentComment.replies = [...(parentComment.replies ?? []), nextComment]
        commentMap.set(nextComment.id, nextComment)
        return
      }
    }
    topLevelStoredComments.push(nextComment)
    commentMap.set(nextComment.id, nextComment)
  })

  return [...topLevelStoredComments, ...clonedComments]
}

function getReviewsForHospital(hospital: HospitalItem) {
  const stored = readStoredReviews()
  const storedComments = readStoredComments()
  const reviews = [...(stored[hospital.id] ?? []), ...getDemoReviewsForHospital(hospital)]

  return reviews.map((review) => ({
    ...review,
    comments: mergeReviewComments(review.comments, storedComments[review.id]),
  }))
}

export const hospitalDetailService = {
  async getHospital(id: string) {
    const hospital = getDemoHospitalById(id)
    if (!hospital) throw new Error("병원 정보를 찾을 수 없습니다.")
    return hospital
  },

  async getHospitalReviews(hospital: HospitalItem) {
    return getReviewsForHospital(hospital)
  },

  async createReview({
    hospitalId,
    memberId,
    content,
    rating,
    visitDate,
    imageUrls,
  }: {
    hospitalId: string
    memberId?: string | number
    content: string
    rating: number
    visitDate: string
    imageUrls: string[]
  }) {
    const stored = readStoredReviews()
    const id = `user-review-${Date.now()}`
    const review: HospitalReviewItem = {
      id,
      hospitalId,
      memberId,
      content,
      rating,
      visitDate,
      createdAt: new Date().toISOString().slice(0, 10),
      sourceName: "Filtory",
      trustSignal: "high",
      adSuspicion: "low",
      images: imageUrls.map((imageUrl, index) => ({
        id: `${id}-image-${index + 1}`,
        reviewId: id,
        imageUrl,
        altText: `review image ${index + 1}`,
        sortOrder: index,
      })),
      comments: [],
    }

    stored[hospitalId] = [review, ...(stored[hospitalId] ?? [])]
    writeStoredReviews(stored)
    return review
  },

  async addComment({
    reviewId,
    content,
    parentCommentId,
    authorName,
    memberId,
  }: {
    reviewId: string
    content: string
    parentCommentId?: string
    authorName: string
    memberId?: string | number
  }) {
    const storedComments = readStoredComments()
    const newComment: ReviewCommentItem = {
      id: `comment-${Date.now()}`,
      reviewId,
      memberId,
      parentCommentId,
      authorName,
      content,
      likeCount: 0,
      dislikeCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      replies: [],
    }

    storedComments[reviewId] = [newComment, ...(storedComments[reviewId] ?? [])]
    writeStoredComments(storedComments)
    return newComment
  },
}
