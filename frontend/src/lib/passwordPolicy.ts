export const PASSWORD_POLICY = { minLength: 8, maxLength: 72 } as const

export type PasswordPolicyResult = {
  minLength: boolean; hasLetter: boolean; hasNumber: boolean; hasSpecial: boolean; noWhitespace: boolean; withinMax: boolean; valid: boolean
}

export function evaluatePassword(value: string): PasswordPolicyResult {
  const result = {
    minLength: value.length >= PASSWORD_POLICY.minLength,
    hasLetter: /[A-Za-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9\s]/.test(value),
    noWhitespace: !/\s/.test(value),
    withinMax: value.length <= PASSWORD_POLICY.maxLength,
  }
  return { ...result, valid: Object.values(result).every(Boolean) }
}

export function passwordStrength(value: string): "weak" | "medium" | "strong" {
  if (!value) return "weak"
  const checks = evaluatePassword(value)
  const score = [checks.minLength, checks.hasLetter, checks.hasNumber, checks.hasSpecial, checks.noWhitespace, checks.withinMax].filter(Boolean).length
  return score >= 6 ? "strong" : score >= 4 ? "medium" : "weak"
}
