"use client";

import { useEffect, useRef, useState } from "react";

// Hero WhatsApp mock — faithful port of the prototype's autoplay chat loop
// (scripts.Petshop). Types each message, appends it, then loops after a pause.

type ChatMsg = { from: "user" | "bot"; text: string; type: number; gap: number };

const SCRIPT: readonly ChatMsg[] = [
  { from: "user", text: "Oi! Vocês têm horário pra banho e tosa amanhã?", type: 1100, gap: 650 },
  { from: "bot", text: "Oi, tudo bem? Temos sim. Amanhã tenho 10h, 14h e 16h30. Qual o nome e o porte do seu pet?", type: 1650, gap: 800 },
  { from: "user", text: "É a Mel, uma golden grande.", type: 1000, gap: 650 },
  { from: "bot", text: "Perfeito. Banho e tosa para porte grande fica R$ 120 e leva cerca de 2h. Reservo as 14h pra Mel?", type: 1750, gap: 800 },
  { from: "user", text: "Pode reservar!", type: 850, gap: 650 },
  { from: "bot", text: "Agendado: banho e tosa da Mel, amanhã às 14h. Já enviei a confirmação e o endereço. Até lá!", type: 1750, gap: 1000 },
];

type Placed = ChatMsg & { id: string; time: string };

function nowStr() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const botBubble =
  "max-width:80%;background:#ffffff;color:#282926;padding:9px 12px 6px;border-radius:15px 15px 15px 5px;box-shadow:0 1px 1.5px rgba(0,0,0,.13);animation:fl-rise .34s ease both";
const userBubble =
  "max-width:80%;background:#e7f4c4;color:#2a2c25;padding:9px 12px 6px;border-radius:15px 15px 5px 15px;box-shadow:0 1px 1.5px rgba(0,0,0,.13);animation:fl-rise .34s ease both";

function styleObj(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i === -1) continue;
    const key = decl.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = decl.slice(i + 1).trim();
  }
  return out as React.CSSProperties;
}

export function ChatMock() {
  const [chat, setChat] = useState<Placed[]>([]);
  const [typing, setTyping] = useState<"user" | "bot" | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    let i = 0;
    const step = () => {
      if (i >= SCRIPT.length) {
        const t = setTimeout(() => {
          setChat([]);
          setTyping(null);
          const t2 = setTimeout(() => {
            i = 0;
            step();
          }, 650);
          pending.push(t2);
        }, 4400);
        pending.push(t);
        return;
      }
      const msg = SCRIPT[i];
      setTyping(msg.from);
      const t = setTimeout(() => {
        const idx = i;
        setChat((prev) => [...prev, { ...msg, id: `m${idx}`, time: nowStr() }]);
        setTyping(null);
        i++;
        const t2 = setTimeout(step, msg.gap);
        pending.push(t2);
      }, msg.type);
      pending.push(t);
    };
    const t0 = setTimeout(step, 650);
    pending.push(t0);
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);

  const statusText = typing === "bot" ? "digitando…" : "online";

  return (
    <div style={{ position: "relative", justifySelf: "center" }}>
      <div style={{ position: "absolute", top: 34, left: -46, zIndex: 3, display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", color: "#282926", fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 11, boxShadow: "0 12px 30px rgba(0,0,0,.35)", animation: "fl-bob 6s ease-in-out infinite" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7bc448" }} /> Respondeu em 8s
      </div>
      <div style={{ position: "absolute", bottom: 84, right: -40, zIndex: 3, display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", color: "#282926", fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 11, boxShadow: "0 12px 30px rgba(0,0,0,.35)", animation: "fl-bob 7s ease-in-out infinite .6s" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7bc448" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Agendou sozinha
      </div>

      <div style={{ position: "relative", width: 374, maxWidth: "100%", background: "#fff", borderRadius: 26, overflow: "hidden", boxShadow: "0 36px 80px rgba(0,0,0,.55)", border: "1px solid rgba(255,255,255,.12)" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, background: "#282926", padding: "13px 15px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/logo-icon.png" alt="Fluuy" width={38} height={38} style={{ borderRadius: 10, display: "block", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>Fluuy · atendimento</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7bc448", boxShadow: "0 0 0 0 rgba(123,196,72,.5)", animation: "fl-pulse 2s infinite" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{statusText}</span>
            </div>
          </div>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
        </div>
        {/* body */}
        <div style={{ height: 432, padding: "16px 15px", background: "#ece6dc", backgroundImage: "radial-gradient(rgba(0,0,0,.022) 1px,transparent 1px)", backgroundSize: "18px 18px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 9, overflow: "hidden" }}>
          <div style={{ alignSelf: "center", background: "rgba(40,41,38,.07)", color: "rgba(40,41,38,.5)", fontSize: 10.5, fontWeight: 500, padding: "4px 11px", borderRadius: 999, marginBottom: 4 }}>hoje</div>
          {chat.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: m.from === "bot" ? "flex-start" : "flex-end" }}>
              <div style={styleObj(m.from === "bot" ? botBubble : userBubble)}>
                <div style={{ fontSize: 14.5, lineHeight: 1.46 }}>{m.text}</div>
                <div className="fl-mono" style={{ fontSize: 10, textAlign: "right", marginTop: 2, color: "rgba(40,41,38,.42)" }}>{m.time}</div>
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: "flex", justifyContent: typing === "bot" ? "flex-start" : "flex-end" }}>
              <div style={styleObj((typing === "bot" ? "background:#fff;border-radius:15px 15px 15px 5px" : "background:#e7f4c4;border-radius:15px 15px 5px 15px") + ";padding:11px 14px;display:flex;gap:4px;align-items:center;box-shadow:0 1px 1.5px rgba(0,0,0,.13);animation:fl-rise .34s ease both")}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(40,41,38,.5)", animation: "fl-blink 1.1s infinite 0s" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(40,41,38,.5)", animation: "fl-blink 1.1s infinite .18s" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(40,41,38,.5)", animation: "fl-blink 1.1s infinite .36s" }} />
              </div>
            </div>
          )}
        </div>
        {/* input */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#f4f1ea", padding: "11px 13px", borderTop: "1px solid rgba(0,0,0,.06)" }}>
          <div style={{ flex: 1, background: "#fff", borderRadius: 999, padding: "10px 15px", fontSize: 13.5, color: "rgba(40,41,38,.4)" }}>Mensagem</div>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#d6f272", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282926" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
