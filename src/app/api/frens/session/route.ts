// TASK-280 dual-read shim: this handler now lives at
// src/app/api/member/session/route.ts. This old /api/frens/session URL keeps
// answering — one implementation, two URLs, no drift.
export { GET, POST, PUT, DELETE } from "@/app/api/member/session/route";
