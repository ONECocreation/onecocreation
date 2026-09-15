// TASK-280 dual-read shim: this handler now lives at
// src/app/api/member/upload/route.ts. This old /api/frens/upload URL keeps
// answering — one implementation, two URLs, no drift.
export { POST } from "@/app/api/member/upload/route";
