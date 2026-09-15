// TASK-280 dual-read shim: this handler now lives at
// src/app/api/member/whois/route.ts. This old /api/frens/whois URL keeps
// answering — one implementation, two URLs, no drift.
export { GET } from "@/app/api/member/whois/route";
