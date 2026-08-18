"use client";

import { useState } from "react";

/** Her form, our rails: name · email · subject · message · SEND. */
const field: React.CSSProperties = {
  border: "1px solid rgba(139,118,196,.45)", borderRadius: 10, padding: "10px 13px",
  background: "rgba(255,255,255,.94)", fontSize: "1rem", color: "#4a4458",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [note, setNote] = useState("");

  async function send() {
    if (state === "busy") return;
    setState("busy");
    setNote("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message, company }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      setState("sent");
    } else {
      setState("error");
      setNote(res?.reason ?? "that didn't take — try again");
    }
  }

  if (state === "sent") {
    return (
      <p style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", color: "#3c6b49", textAlign: "center", margin: "20px 0" }}>
        Sent with love 💛 — Love will write back to {email}.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={field} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={field} />
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" style={field} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message…" rows={5}
        style={{ ...field, resize: "vertical" }} />
      <input value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off"
        aria-hidden style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} placeholder="company" />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
        <button className="btn" onClick={send} disabled={state === "busy" || !name || !email || !message}>
          {state === "busy" ? "Sending…" : "SEND ✉️"}
        </button>
      </div>
      {note && <p style={{ margin: 0, fontSize: ".82rem", color: "#a34e6c", textAlign: "center" }}>{note}</p>}
    </div>
  );
}
