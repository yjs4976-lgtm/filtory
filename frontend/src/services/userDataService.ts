export const userDataService = {
  async downloadMyData() {
    // TODO: 실제 데이터 다운로드 API가 준비되면 /api/member/data/export로 교체합니다.
    return { success: true, message: "내 데이터 다운로드가 준비되었어요." }
  },

  async deleteAnalysisHistory() {
    // TODO: 실제 분석 기록 전체 삭제 API 연결 시 DELETE /api/member/data/analysis-history 호출로 교체합니다.
    return { success: true }
  },

  async deleteSavedHospitals() {
    // TODO: 실제 저장 병원 전체 삭제 API 연결 시 DELETE /api/member/data/saved-hospitals 호출로 교체합니다.
    return { success: true }
  },

  async deleteRecentHospitals() {
    // TODO: 실제 최근 본 병원 전체 삭제 API 연결 시 DELETE /api/member/data/recent-hospitals 호출로 교체합니다.
    return { success: true }
  },
}
