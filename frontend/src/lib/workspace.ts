import type { User, Workspace, WorkspacePreference } from "@/lib/types"

export interface WorkspaceSettings {
  currentWorkspace: Workspace
  preferredWorkspace: WorkspacePreference
  lastWorkspace: Workspace
  hasSeenAdminWorkspaceIntro: boolean
}

const DEFAULT_SETTINGS: WorkspaceSettings = {
  currentWorkspace: "USER",
  preferredWorkspace: "LAST_USED",
  lastWorkspace: "USER",
  hasSeenAdminWorkspaceIntro: false,
}

const keyFor = (userId: User["id"]) => `filtory:workspace:${userId}`
const isWorkspace = (value: unknown): value is Workspace => value === "USER" || value === "ADMIN"
const isPreference = (value: unknown): value is WorkspacePreference => isWorkspace(value) || value === "LAST_USED"

export function readWorkspaceSettings(user: User): WorkspaceSettings {
  if (typeof window === "undefined" || user.role !== "ADMIN") return DEFAULT_SETTINGS
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(user.id)) ?? "{}") as Partial<WorkspaceSettings>
    return {
      currentWorkspace: isWorkspace(raw.currentWorkspace) ? raw.currentWorkspace : "USER",
      preferredWorkspace: isPreference(raw.preferredWorkspace) ? raw.preferredWorkspace : "LAST_USED",
      lastWorkspace: isWorkspace(raw.lastWorkspace) ? raw.lastWorkspace : "USER",
      hasSeenAdminWorkspaceIntro: raw.hasSeenAdminWorkspaceIntro === true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeWorkspaceSettings(user: User, settings: WorkspaceSettings) {
  if (typeof window === "undefined" || user.role !== "ADMIN") return
  // TODO: Replace local workspace preference with user settings API.
  // TODO: Persist workspace intro status in user preference API.
  localStorage.setItem(keyFor(user.id), JSON.stringify(settings))
}

export function getWorkspaceStartPath(settings: WorkspaceSettings) {
  const workspace = settings.preferredWorkspace === "LAST_USED"
    ? settings.lastWorkspace
    : settings.preferredWorkspace
  return workspace === "ADMIN" ? "/admin" : "/"
}

let dirty = false
export function setWorkspaceDirty(value: boolean) { dirty = value }
export function hasUnsavedWorkspaceChanges() { return dirty }
