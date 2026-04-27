import { Role } from "@prisma/client";
import type { SessionUser } from "./auth";

// Capability matrix — keep all permission decisions here so the UI and the API
// stay in sync. Anything not listed defaults to deny.
export const can = {
  viewParticipantsList: (u: SessionUser) =>
    u.role !== Role.EXTERNAL_VIEWER,
  viewParticipantQuick: (u: SessionUser) =>
    u.role !== Role.EXTERNAL_VIEWER,
  viewParticipantFull: (u: SessionUser) =>
    u.role === Role.TEAM_LEAD || u.role === Role.ADMIN,
  editParticipant: (u: SessionUser) =>
    u.role === Role.TEAM_LEAD || u.role === Role.ADMIN,
  createCaseNote: (u: SessionUser) =>
    u.role === Role.SUPPORT_WORKER ||
    u.role === Role.TEAM_LEAD ||
    u.role === Role.ADMIN,
  approveCaseNote: (u: SessionUser) =>
    u.role === Role.TEAM_LEAD || u.role === Role.ADMIN,
  generateReport: (u: SessionUser) =>
    u.role === Role.TEAM_LEAD || u.role === Role.ADMIN,
  shareReport: (u: SessionUser) =>
    u.role === Role.TEAM_LEAD || u.role === Role.ADMIN,
  manageUsers: (u: SessionUser) => u.role === Role.ADMIN,
  manageBranding: (u: SessionUser) => u.role === Role.ADMIN,
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPPORT_WORKER: "Support worker",
  TEAM_LEAD: "Team lead",
  ADMIN: "Admin",
  EXTERNAL_VIEWER: "External viewer",
};
