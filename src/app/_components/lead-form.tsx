"use client";

import { useActionState } from "react";

import { submitLeadAction, type LeadFormState } from "../actions";

const initialState: LeadFormState = { status: "idle" };

export function LeadForm() {
  const [state, formAction, pending] = useActionState(submitLeadAction, initialState);

  if (state.status === "success") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 13, background: "#282926", color: "#fff", borderRadius: 16, padding: "18px 20px", textAlign: "left", animation: "fl-rise .4s ease both" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#d6f272", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#282926" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15.5 }}>Recebemos seu contato, {state.firstName}!</div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.65)" }}>A gente te chama no WhatsApp em instantes.</div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, background: "rgba(255,255,255,.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(40,41,38,.13)", borderRadius: 16, padding: 18 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#3a3c34", textAlign: "center" }}>Prefere que a gente te chame? Deixe seu contato</div>
      <label htmlFor="lead-nome" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Seu nome</label>
      <input
        id="lead-nome"
        name="nome"
        required
        maxLength={120}
        placeholder="Seu nome"
        className="fl-lead-input"
        style={{ width: "100%", background: "#fff", border: "1px solid rgba(40,41,38,.16)", borderRadius: 10, padding: "13px 14px", fontSize: 15, fontFamily: "inherit", color: "#282926", outline: "none" }}
      />
      <label htmlFor="lead-contato" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>E-mail ou telefone</label>
      <input
        id="lead-contato"
        name="contato"
        required
        maxLength={160}
        placeholder="E-mail ou telefone"
        className="fl-lead-input"
        style={{ width: "100%", background: "#fff", border: "1px solid rgba(40,41,38,.16)", borderRadius: 10, padding: "13px 14px", fontSize: 15, fontFamily: "inherit", color: "#282926", outline: "none" }}
      />
      <button
        type="submit"
        disabled={pending}
        className="fl-lead-submit"
        style={{ width: "100%", background: "#282926", color: "#d6f272", fontWeight: 600, fontSize: 15, padding: 14, border: "none", borderRadius: 10, cursor: pending ? "wait" : "pointer", fontFamily: "inherit", opacity: pending ? 0.75 : 1 }}
      >
        {pending ? "Enviando…" : "Quero receber contato"}
      </button>
      {state.status === "error" && (
        <div role="alert" style={{ fontSize: 12.5, color: "#a23a2d", textAlign: "center" }}>{state.message}</div>
      )}
    </form>
  );
}
