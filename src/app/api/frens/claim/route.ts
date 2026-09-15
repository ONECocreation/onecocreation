// TASK-280 dual-read shim: this handler now lives at
// src/app/api/member/claim/route.ts. This old /api/frens/claim URL keeps
// answering — one implementation, two URLs, no drift.
export { POST } from "@/app/api/member/claim/route";
