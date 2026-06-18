"use client"

import { useMemo, useState } from "react"

export function useReviewFilter(reviews = []) {
  const [filter, setFilter] = useState("all")

  const filteredReviews = useMemo(() => {
    if (filter === "all") return reviews
    return reviews.filter((review) => review.type === filter)
  }, [filter, reviews])

  return { filter, setFilter, filteredReviews }
}
