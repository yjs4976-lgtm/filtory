"use client"

import { useState } from "react"

export function useAnalyzeForm() {
  const [form, setForm] = useState({
    hospital: "",
    category: "derma",
    naver: "",
    google: "",
    review: "",
    mode: "ko",
  })

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return { form, updateField, setForm }
}
