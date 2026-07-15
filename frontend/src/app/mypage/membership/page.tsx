"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { SubscriptionManagement } from "@/components/membership/SubscriptionManagement"

export default function MembershipPage() { return <ProtectedRoute><AppShell title="구독 관리" showBack><SubscriptionManagement /></AppShell></ProtectedRoute> }
