"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react"
import { AppShell } from "@/components/common/AppShell"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SectionPager } from "@/components/common/SectionPager"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import type { HospitalItem, HospitalReviewItem, ReviewCommentItem } from "@/lib/types"
import { hospitalDetailService } from "@/services/hospitalDetailService"
import styles from "@/styles/App.module.css"

type ReactionType = "like" | "dislike"

export default function HospitalDetailPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [hospital, setHospital] = useState<HospitalItem | null>(null)
  const [reviews, setReviews] = useState<HospitalReviewItem[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function loadHospital() {
      try {
        setIsLoading(true)
        setError("")
        const nextHospital = await hospitalDetailService.getHospital(params.id)
        const nextReviews = await hospitalDetailService.getHospitalReviews(nextHospital)
        if (!alive) return
        setHospital(nextHospital)
        setReviews(nextReviews)
      } catch (error) {
        if (alive) setError(error instanceof Error ? error.message : t.hospital.loadFailed)
      } finally {
        if (alive) setIsLoading(false)
      }
    }

    loadHospital()
    return () => {
      alive = false
    }
  }, [params.id, t.hospital.loadFailed])

  const reviewCount = useMemo(() => reviews.length, [reviews.length])

  const handleReviewCreated = (review: HospitalReviewItem) => {
    setReviews((currentReviews) => [review, ...currentReviews])
  }

  const handleAddComment = async (reviewId: string, content: string, parentCommentId?: string) => {
    if (!hospital) return
    const comment = await hospitalDetailService.addComment({
      reviewId,
      content,
      parentCommentId,
      authorName: user?.nickname || t.hospital.guest,
      memberId: user?.id,
    })

    setReviews((currentReviews) =>
      currentReviews.map((review) => {
        if (review.id !== reviewId) return review
        const comments = review.comments ?? []
        if (!parentCommentId) return { ...review, comments: [comment, ...comments] }
        return {
          ...review,
          comments: comments.map((item) =>
            item.id === parentCommentId ? { ...item, replies: [...(item.replies ?? []), comment] } : item
          ),
        }
      })
    )
  }

  const handleReact = (reviewId: string, commentId: string, reaction: ReactionType) => {
    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              comments: (review.comments ?? []).map((comment) => updateReaction(comment, commentId, reaction)),
            }
          : review
      )
    )
  }

  if (isLoading) {
    return (
      <AppShell title={t.hospital.title} showBack>
        <LoadingSpinner label={t.common.loading} />
      </AppShell>
    )
  }

  if (!hospital || error) {
    return (
      <AppShell title={t.hospital.title} showBack>
        <EmptyState title={t.hospital.notFound} description={error || t.hospital.notFoundDescription} />
      </AppShell>
    )
  }

  const sections = [
    {
      id: "info",
      content: (
        <div className={styles.stackSm}>
          <section className={styles.hospitalHero}>
            <div
              className={styles.hospitalHeroImage}
              style={{ backgroundImage: `url(${hospital.imageUrl ?? "/images/logo.svg"})` }}
              aria-hidden="true"
            />
            <div className={styles.stackSm}>
              <p className={styles.memberEyebrow}>{t.categories[hospital.category]}</p>
              <h1>{hospital.name}</h1>
              <p>{hospital.description ?? t.hospital.descriptionFallback}</p>
              <div className={styles.badgeRow}>
                <span className={styles.neutralPill}>{hospital.address}</span>
                <span className={styles.neutralPill}>{t.hospital.reviewCount} {reviewCount}</span>
              </div>
            </div>
          </section>

          <section className={`${styles.card} ${styles.stackSm}`}>
            <h2 className={styles.titleMd}>{t.hospital.basicInfo}</h2>
            <p className={styles.bodyText}>{hospital.treatmentItems ?? t.hospital.treatmentFallback}</p>
            {hospital.phone && <p className={styles.mutedText}>{hospital.phone}</p>}
            {hospital.homepageUrl && (
              <a className={styles.sourceLink} href={hospital.homepageUrl} target="_blank" rel="noreferrer">
                {t.hospital.homepage}
              </a>
            )}
          </section>
        </div>
      ),
    },
    {
      id: "write",
      content: <ReviewWriteForm hospitalId={hospital.id} memberId={user?.id} onCreated={handleReviewCreated} />,
    },
    {
      id: "reviews",
      content: (
        <section className={styles.stackSm}>
          <h2 className={styles.titleMd}>{t.hospital.reviews}</h2>
          {reviews.length === 0 ? (
            <EmptyState title={t.hospital.emptyReviews} description={t.hospital.emptyReviewsDescription} />
          ) : (
            reviews.map((review) => (
              <HospitalReviewCard
                key={review.id}
                review={review}
                onAddComment={(content, parentCommentId) => handleAddComment(review.id, content, parentCommentId)}
                onReact={(commentId, reaction) => handleReact(review.id, commentId, reaction)}
              />
            ))
          )}
        </section>
      ),
    },
  ]

  return (
    <AppShell title={hospital.name} showBack>
      <SectionPager sections={sections} previousLabel={t.common.previous} nextLabel={t.common.next} />
    </AppShell>
  )
}

function ReviewWriteForm({
  hospitalId,
  memberId,
  onCreated,
}: {
  hospitalId: string
  memberId?: string | number
  onCreated: (review: HospitalReviewItem) => void
}) {
  const { t } = useLanguage()
  const [content, setContent] = useState("")
  const [rating, setRating] = useState(5)
  const [visitDate, setVisitDate] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [error, setError] = useState("")

  const handleFileChange = (files: FileList | null) => {
    if (!files) return
    const nextUrls = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 4)
      .map((file) => URL.createObjectURL(file))
    setImageUrls(nextUrls)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!content.trim()) {
      setError(t.hospital.reviewRequired)
      return
    }

    const review = await hospitalDetailService.createReview({
      hospitalId,
      memberId,
      content,
      rating,
      visitDate,
      imageUrls,
    })
    onCreated(review)
    setContent("")
    setRating(5)
    setVisitDate("")
    setImageUrls([])
  }

  return (
    <form className={`${styles.card} ${styles.stackSm}`} onSubmit={handleSubmit}>
      <h2 className={styles.titleMd}>{t.hospital.writeReview}</h2>
      {error && <p className={styles.formError}>{error}</p>}
      <label className={styles.label}>
        {t.hospital.rating}
        <input
          className={styles.input}
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
        />
      </label>
      <label className={styles.label}>
        {t.hospital.visitDate}
        <input className={styles.input} type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} />
      </label>
      <label className={styles.label}>
        {t.hospital.reviewContent}
        <textarea
          className={styles.textarea}
          placeholder={t.hospital.reviewPlaceholder}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <label className={styles.label}>
        {t.hospital.photos}
        <input className={styles.input} type="file" accept="image/*" multiple onChange={(event) => handleFileChange(event.target.files)} />
      </label>
      {imageUrls.length > 0 && (
        <div className={styles.imagePreviewGrid}>
          {imageUrls.map((url) => (
            <span key={url} className={styles.imagePreview} style={{ backgroundImage: `url(${url})` }} />
          ))}
        </div>
      )}
      <button className={styles.primaryButton} type="submit">
        {t.hospital.submitReview}
      </button>
    </form>
  )
}

function HospitalReviewCard({
  review,
  onAddComment,
  onReact,
}: {
  review: HospitalReviewItem
  onAddComment: (content: string, parentCommentId?: string) => void
  onReact: (commentId: string, reaction: ReactionType) => void
}) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const comments = review.comments ?? []

  return (
    <article className={`${styles.reviewCard} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <strong>{review.rating ?? 5}/5</strong>
        <span className={styles.mutedText}>{review.visitDate ?? review.createdAt}</span>
      </div>
      <p className={styles.bodyText}>{review.content}</p>
      {review.images && review.images.length > 0 && (
        <div className={styles.imagePreviewGrid}>
          {review.images.map((image) => (
            <span key={image.id} className={styles.imagePreview} style={{ backgroundImage: `url(${image.imageUrl})` }} />
          ))}
        </div>
      )}
      <button type="button" className={styles.textButton} onClick={() => setExpanded((current) => !current)}>
        <MessageCircle className={styles.iconSm} />
        {expanded ? t.hospital.collapseComments : `${t.hospital.comments} ${comments.length}`}
      </button>
      {expanded && (
        <div className={styles.commentThread}>
          <CommentForm onAddComment={onAddComment} />
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} reviewId={review.id} onAddComment={onAddComment} onReact={onReact} />
          ))}
        </div>
      )}
    </article>
  )
}

function CommentForm({
  parentCommentId,
  onAddComment,
}: {
  parentCommentId?: string
  onAddComment: (content: string, parentCommentId?: string) => void
}) {
  const { t } = useLanguage()
  const [content, setContent] = useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content.trim()) return
    onAddComment(content, parentCommentId)
    setContent("")
  }

  return (
    <form className={styles.commentForm} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        value={content}
        placeholder={parentCommentId ? t.hospital.replyPlaceholder : t.hospital.commentPlaceholder}
        onChange={(event) => setContent(event.target.value)}
      />
      <button type="submit" className={styles.smallPillButton}>
        {parentCommentId ? t.hospital.reply : t.hospital.comment}
      </button>
    </form>
  )
}

function CommentItem({
  comment,
  reviewId,
  onAddComment,
  onReact,
}: {
  comment: ReviewCommentItem
  reviewId: string
  onAddComment: (content: string, parentCommentId?: string) => void
  onReact: (commentId: string, reaction: ReactionType) => void
}) {
  const { t } = useLanguage()
  const [replyOpen, setReplyOpen] = useState(false)

  return (
    <article className={styles.commentItem}>
      <strong>{comment.authorName}</strong>
      <p>{comment.content}</p>
      <div className={styles.commentActions}>
        <button type="button" onClick={() => onReact(comment.id, "like")}>
          <ThumbsUp className={styles.iconXs} /> {comment.likeCount}
        </button>
        <button type="button" onClick={() => onReact(comment.id, "dislike")}>
          <ThumbsDown className={styles.iconXs} /> {comment.dislikeCount}
        </button>
        <button type="button" onClick={() => setReplyOpen((current) => !current)}>
          {t.hospital.reply}
        </button>
      </div>
      {replyOpen && <CommentForm parentCommentId={comment.id} onAddComment={onAddComment} />}
      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.replyList}>
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} reviewId={reviewId} onAddComment={onAddComment} onReact={onReact} />
          ))}
        </div>
      )}
    </article>
  )
}

function updateReaction(comment: ReviewCommentItem, commentId: string, reaction: ReactionType): ReviewCommentItem {
  if (comment.id === commentId) {
    if (comment.userReaction === reaction) return comment
    return {
      ...comment,
      userReaction: reaction,
      likeCount: reaction === "like" ? comment.likeCount + 1 : Math.max(0, comment.likeCount - (comment.userReaction === "like" ? 1 : 0)),
      dislikeCount:
        reaction === "dislike" ? comment.dislikeCount + 1 : Math.max(0, comment.dislikeCount - (comment.userReaction === "dislike" ? 1 : 0)),
    }
  }

  return {
    ...comment,
    replies: comment.replies?.map((reply) => updateReaction(reply, commentId, reaction)),
  }
}
