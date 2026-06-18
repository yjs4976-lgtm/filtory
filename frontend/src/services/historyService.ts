import { recentAnalyses } from "@/lib/mockData"
import { apiClient } from "./apiClient"

export async function getHistory() {
  try {
    return await apiClient("/history")
  } catch {
    return recentAnalyses
  }
}
