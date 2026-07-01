"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useReveal } from "./reveal";

const EASE = "cubic-bezier(.22,.61,.36,1)";

// ─────────────────────────── STEPS (Como funciona) ───────────────────────────
const STEPS: { badge: string; title: string; body: string; dark?: boolean; icon: ReactNode }[] = [
  {
    badge: "PASSO 01",
    title: "Conecte seu WhatsApp",
    body: "Escaneie o QR code e conecte seu número atual em menos de 2 minutos. Sem trocar de chip.",
    icon: <path d="M9 9 4.5 13.5a3.5 3.5 0 0 0 5 5L14 14M15 15l4.5-4.5a3.5 3.5 0 0 0-5-5L10 10" />,
  },
  {
    badge: "PASSO 02",
    title: "Configure seu agente",
    body: "Diga o que a Fluuy precisa saber: serviços, preços e horários. Ela aprende o tom do seu negócio.",
    icon: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="9" cy="6" r="2.3" fill="#d6f272" />
        <circle cx="15" cy="12" r="2.3" fill="#d6f272" />
        <circle cx="8" cy="18" r="2.3" fill="#d6f272" />
      </>
    ),
    dark: false,
  },
  {
    badge: "PASSO 03",
    title: "Atenda no automático",
    body: "A Fluuy responde, agenda e encaminha sozinha. Você assume a conversa só quando quiser.",
    dark: true,
    icon: <><rect x="4" y="7" width="16" height="12" rx="3.5" /><path d="M12 7V4M9 13h.01M15 13h.01M9.5 16h5" /></>,
  },
];

export function StepsGrid() {
  const { ref, revealed } = useReveal<HTMLDivElement>(0.25);
  const sv = (i: number): React.CSSProperties => ({
    textAlign: "center",
    transition: `opacity .6s ${EASE},transform .6s ${EASE}`,
    transitionDelay: `${i * 0.16}s`,
    opacity: revealed ? 1 : 0,
    transform: revealed ? "none" : "translateY(44px)",
  });

  return (
    <div ref={ref} style={{ position: "relative", marginTop: 66 }}>
      <div
        className="fl-steps-line"
        style={{ position: "absolute", top: 35, left: "16.6%", right: "16.6%", height: 0, borderTop: "2px dashed #c8d49a", zIndex: 0, transition: "opacity .7s ease .05s", opacity: revealed ? 1 : 0 }}
      />
      <div className="fl-steps-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 30, zIndex: 1 }}>
        {STEPS.map((s, i) => (
          <div key={s.badge} style={sv(i)}>
            <div
              className="fl-step-icon"
              style={{ width: 70, height: 70, margin: "0 auto 22px", borderRadius: "50%", background: s.dark ? "#282926" : "#d6f272", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 9px #fff,0 0 0 10px #eef2dc" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={s.dark ? "#d6f272" : "#282926"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
            </div>
            <div className="fl-mono" style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: ".6px", color: s.dark ? "#8a9460" : "#a9b277", marginBottom: 9 }}>{s.badge}</div>
            <h3 style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.4px", margin: "0 0 9px" }}>{s.title}</h3>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(40,41,38,.6)", margin: "0 auto", maxWidth: "30ch" }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── FEATURES (Recursos) ───────────────────────────
const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  { title: "Respostas instantâneas", body: "Responde em segundos, a qualquer hora, sem fila de espera e sem cliente no vácuo.", icon: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /> },
  { title: "Agendamentos automáticos", body: "Marca horários, evita conflitos e envia lembretes direto na conversa.", icon: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4M9 14.5l2.2 2.2 4.3-4.2" /></> },
  { title: "Tom do seu negócio", body: "Fala como a sua marca fala. Você define a personalidade e os limites do agente.", icon: <path d="M21 11.5a8 8 0 0 1-11.5 7.2L3 21l2.3-6.5A8 8 0 1 1 21 11.5z" /> },
  { title: "Transferência inteligente", body: "Passa pro humano nos casos certos, com todo o histórico e contexto da conversa.", icon: <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" /> },
  { title: "Vários atendimentos juntos", body: "Atende centenas de clientes em paralelo, sem perder o fio de nenhuma conversa.", icon: <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3zM3 12l9 4.5L21 12M3 16.5 12 21l9-4.5" /> },
  { title: "Painel completo", body: "Acompanhe conversas, métricas e resultados de cada agente em um lugar só.", icon: <><path d="M3 3v18h18" /><path d="M7 14v3M12 9v8M17 5v12" /></> },
];

export function FeaturesGrid() {
  const { ref, revealed } = useReveal<HTMLDivElement>(0.18);
  const rv = (i: number): React.CSSProperties => ({
    transition: `opacity .6s ${EASE},transform .6s ${EASE}`,
    transitionDelay: `${i * 0.13}s`,
    opacity: revealed ? 1 : 0,
    transform: revealed ? "none" : "translateY(42px)",
  });

  return (
    <div ref={ref} className="fl-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 50 }}>
      {FEATURES.map((f, i) => (
        <div key={f.title} style={rv(i)}>
          <div className="fl-feature-card" style={{ height: "100%", background: "#fff", border: "1px solid #ddd9d0", borderRadius: 18, padding: 28 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#f0f6d6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#6f7b41" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
            </div>
            <h3 style={{ fontSize: 18.5, fontWeight: 600, letterSpacing: "-.3px", margin: "0 0 8px" }}>{f.title}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "rgba(40,41,38,.6)", margin: 0 }}>{f.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── PRACTICE LIST (Demo left) ───────────────────────────
const PRACTICE = [
  { title: "Entende o pedido", body: "Lê a mensagem em linguagem natural e identifica o que o cliente precisa." },
  { title: "Sugere o melhor horário", body: "Consulta a agenda, oferece as opções livres e confirma com o cliente." },
  { title: "Confirma e registra sozinha", body: "Agenda, envia a confirmação e deixa tudo anotado no painel." },
];

export function PracticeList() {
  const { ref, revealed } = useReveal<HTMLDivElement>(0.3);
  const pv = (i: number): React.CSSProperties => ({
    display: "flex",
    gap: 15,
    alignItems: "flex-start",
    transition: `opacity .55s ${EASE},transform .55s ${EASE}`,
    transitionDelay: `${i * 0.15}s`,
    opacity: revealed ? 1 : 0,
    transform: revealed ? "none" : "translateX(-26px)",
  });

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {PRACTICE.map((p, i) => (
        <div key={p.title} style={pv(i)}>
          <div className="fl-mono" style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(214,242,114,.13)", color: "#d6f272", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, flexShrink: 0 }}>{i + 1}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{p.title}</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "rgba(230,230,230,.6)" }}>{p.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── CONVO DEMO (Demo right) ───────────────────────────
const CONVO: { text: string; tag?: string }[] = [
  { text: "Oi! Vocês têm horário pra banho amanhã?" },
  { text: "Temos sim! Amanhã tenho 10h, 14h e 16h30. Qual o nome do seu pet?", tag: "entende" },
  { text: "É a Mel, uma golden grande." },
  { text: "Banho e tosa fica R$ 120 e leva ~2h. Reservo as 14h pra Mel?", tag: "sugere" },
  { text: "Pode reservar!" },
  { text: "Agendado: Mel, amanhã às 14h. Enviei a confirmação. Até lá!", tag: "confirma" },
];

export function ConvoDemo() {
  const { ref, revealed } = useReveal<HTMLDivElement>(0.25);
  const cv = (i: number): React.CSSProperties => {
    const isUser = i % 2 === 0;
    return {
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      alignItems: isUser ? undefined : "center",
      gap: isUser ? undefined : 9,
      transition: `opacity .5s ${EASE},transform .5s ${EASE}`,
      transitionDelay: `${i * 0.14}s`,
      opacity: revealed ? 1 : 0,
      transform: revealed ? "none" : `translateX(${isUser ? "30px" : "-30px"})`,
    };
  };

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 11, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: 26 }}>
      {CONVO.map((m, i) => {
        const isUser = i % 2 === 0;
        return (
          <div key={m.text} style={cv(i)}>
            <div style={{ maxWidth: isUser ? "78%" : "80%", background: isUser ? "#e7f4c4" : "#fff", color: isUser ? "#2a2c25" : "#282926", padding: "11px 14px", borderRadius: isUser ? "15px 15px 5px 15px" : "15px 15px 15px 5px", fontSize: 14.5, lineHeight: 1.45 }}>{m.text}</div>
            {m.tag && <span style={{ fontSize: 11, color: "#d6f272", fontWeight: 600, whiteSpace: "nowrap" }}>{m.tag}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── METRICS COUNTER ───────────────────────────
const TARGETS = { atend: 4200, tempo: 12, satisf: 97, conv: 38 };

export function Metrics() {
  const { ref, revealed } = useReveal<HTMLDivElement>(0.35);
  // Derive animated values from a single reveal trigger via CSS-less rAF.
  return <MetricsInner innerRef={ref} start={revealed} />;
}

function MetricsInner({ innerRef, start }: { innerRef: React.RefObject<HTMLDivElement | null>; start: boolean }) {
  const items: { key: keyof typeof TARGETS; render: (v: number) => string; label: string }[] = [
    { key: "atend", render: (v) => "+" + Math.round(v).toLocaleString("pt-BR"), label: "atendimentos por mês" },
    { key: "tempo", render: (v) => Math.round(v) + "s", label: "tempo médio de resposta" },
    { key: "satisf", render: (v) => Math.round(v) + "%", label: "clientes satisfeitos" },
    { key: "conv", render: (v) => "+" + Math.round(v) + "%", label: "mais agendamentos" },
  ];
  const m = useCountUp(start, 1700);
  return (
    <div ref={innerRef} id="resultados" data-screen-label="Resultados" style={{ marginTop: 88, paddingTop: 60, borderTop: "1px solid rgba(255,255,255,.09)" }}>
      <h3 style={{ textAlign: "center", fontSize: "clamp(24px,3vw,34px)", fontWeight: 600, letterSpacing: "-.8px", color: "#fff", margin: "0 0 48px" }}>Resultados que aparecem já na primeira semana</h3>
      <div className="fl-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
        {items.map((it, i) => (
          <div key={it.key} style={{ textAlign: "center", borderLeft: i === 0 ? undefined : "1px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontSize: "clamp(40px,5vw,58px)", fontWeight: 600, letterSpacing: "-2px", color: "#d6f272", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{it.render(m * TARGETS[it.key])}</div>
            <div style={{ fontSize: 14.5, color: "rgba(230,230,230,.6)", marginTop: 10 }}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function useCountUp(start: boolean, dur: number) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const prog = Math.min(1, (now - t0) / dur);
      setP(1 - Math.pow(1 - prog, 3));
      if (prog < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, dur]);
  return p;
}
