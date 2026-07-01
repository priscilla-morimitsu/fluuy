"use client";

import { useId, useState } from "react";

const FAQS = [
  { q: "A Fluuy funciona no meu número atual do WhatsApp?", a: "Sim. Você conecta o número que já usa, sem trocar de chip e sem perder o histórico das suas conversas." },
  { q: "Preciso saber programar?", a: "Não. Você configura tudo escrevendo em linguagem natural, como se explicasse pra um novo funcionário. Leva poucos minutos." },
  { q: "A Fluuy entende o jeito do meu negócio?", a: "Sim. Você define serviços, preços, horários e o tom de voz. Ela responde como a sua marca falaria." },
  { q: "E quando o caso é mais complexo?", a: "A Fluuy reconhece o momento certo e transfere a conversa pra você com todo o contexto, sem o cliente precisar repetir nada." },
  { q: "Consigo testar antes de pagar?", a: "Sim. Fale com a gente no WhatsApp e configuramos um teste com o cenário real do seu negócio." },
];

export function Faq() {
  const [open, setOpen] = useState(0);
  const baseId = useId();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-panel-${i}`;
        const btnId = `${baseId}-btn-${i}`;
        return (
          <div key={item.q} style={{ border: "1px solid #e6e3dc", borderRadius: 14, padding: "4px 20px", background: "#fafaf8" }}>
            <button
              id={btnId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "none", border: "none", cursor: "pointer", padding: "18px 0", textAlign: "left", fontFamily: "inherit", color: "#282926" }}
            >
              <span style={{ fontSize: 16.5, fontWeight: 600, letterSpacing: "-.2px" }}>{item.q}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7e8a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform .25s ease", transform: `rotate(${isOpen ? 180 : 0}deg)`, flexShrink: 0 }}><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {isOpen && (
              <p id={panelId} role="region" aria-labelledby={btnId} style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(40,41,38,.62)", margin: 0, padding: "0 0 20px", animation: "fl-rise .3s ease both" }}>{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
