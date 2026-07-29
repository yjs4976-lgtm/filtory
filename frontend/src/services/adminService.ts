import type { AdminSummary, AdminUser, UserRole, UserStatus } from "@/lib/types";
import { apiClient } from "./apiClient";

export const adminService = {
  getSummary() {
    return apiClient<AdminSummary>("/api/admin/summary", {
      method: "GET",
      auth: true,
    });
  },

  getUsers() {
    return apiClient<AdminUser[]>("/api/admin/users", {
      method: "GET",
      auth: true,
    });
  },

  updateUserRole(userId: number, role: UserRole) {
    return apiClient<AdminUser>(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: { role },
      auth: true,
    });
  },

  updateUserStatus(userId: number, status: UserStatus) {
    return apiClient<AdminUser>(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    });
  },
};
