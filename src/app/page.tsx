import type { Metadata } from "next";

import { ChatMock } from "./_components/chat-mock";
import { Faq } from "./_components/faq";
import { LeadForm } from "./_components/lead-form";
import { ConvoDemo, FeaturesGrid, Metrics, PracticeList, StepsGrid } from "./_components/sections";
import "./landing.css";

// Fully static marketing page: no per-request data, so Next.js prerenders it at
// build time for the best SEO and TTFB. Only the CTA lead form hits the server
// (via a Server Action).
export const dynamic = "force-static";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fluuy.com";
const WHATSAPP_URL =
  "https://wa.me/5583991175440?text=" +
  encodeURIComponent("Olá! Quero saber mais sobre a Fluuy.");
const TITLE = "Fluuy — Seu WhatsApp respondendo sozinho, 24 horas por dia";
const DESCRIPTION =
  "A Fluuy cria um agente de IA que conversa com seus clientes, tira dúvidas, agenda e fecha vendas no seu WhatsApp. Sem deixar ninguém esperando.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "atendimento automático WhatsApp",
    "agente de IA WhatsApp",
    "chatbot WhatsApp",
    "agendamento automático",
    "petshop",
    "clínica veterinária",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Fluuy",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/landing/logo-light.png", width: 512, height: 512, alt: "Fluuy" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/landing/logo-light.png"] },
  robots: { index: true, follow: true },
};

// WhatsApp glyph reused across CTAs.
function WhatsAppIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.95 1.36-.5.05-1.13.07-1.83-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.15-.2-1.19-1.58-1.19-3.01 0-1.43.75-2.13 1.02-2.42.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.82 2.04.89 2.19.07.15.12.32.02.51-.09.2-.14.32-.28.49-.14.17-.29.38-.42.51-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.27.14.43.12.59-.07.16-.2.68-.79.86-1.06.18-.27.36-.22.61-.13.25.09 1.59.75 1.86.89.27.14.45.2.52.31.07.12.07.66-.17 1.34z" />
    </svg>
  );
}

const NICHES: { label: string; icon: React.ReactNode }[] = [
  { label: "Petshops", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="10" r="1.9" /><circle cx="9.8" cy="6.5" r="2" /><circle cx="14.2" cy="6.5" r="2" /><circle cx="18.5" cy="10" r="1.9" /><path d="M12 12c-2.8 0-5 1.9-5 4.2 0 1.7 1.3 2.8 3 2.8.9 0 1.3-.4 2-.4s1.1.4 2 .4c1.7 0 3-1.1 3-2.8 0-2.3-2.2-4.2-5-4.2z" /></svg> },
  { label: "Clínicas veterinárias", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v5a4 4 0 0 0 8 0V3" /><path d="M9 15.5a5.5 5.5 0 0 0 11 0V13" /><circle cx="20" cy="11" r="2" /></svg> },
  { label: "Restaurantes", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v6a2 2 0 0 0 4 0V3M8 9v12" /><path d="M16.5 3c-1.4 0-2.3 1.8-2.3 4.5S15.1 12 16.5 12v9" /></svg> },
  { label: "Odontologia", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6c-1.6-1.6-3.7-2.2-5.3-1.4C4.9 5.4 4.2 7.6 4.8 10c.4 1.6.5 2.1.7 3.8.2 1.8.4 4.2 1.6 5.6.4.5 1.1.4 1.4-.2.5-1 .7-2.5 1.5-2.5s1 1.5 1.5 2.5c.3.6 1 .7 1.4.2 1.2-1.4 1.4-3.8 1.6-5.6.2-1.7.3-2.2.7-3.8.6-2.4-.1-4.6-1.9-5.4C15.7 3.8 13.6 4.4 12 6z" /></svg> },
  { label: "Salões de beleza", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.1 7.9 20 18M8.1 16.1 20 6" /></svg> },
  { label: "Academias", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5v11M3.5 8.5v7M17.5 6.5v11M20.5 8.5v7M6.5 12h11" /></svg> },
  { label: "Estúdios de estética", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M18.5 15l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" /></svg> },
  { label: "Consultórios médicos", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" /></svg> },
  { label: "Lojas e comércio", icon: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12l-.8 11.2a1 1 0 0 1-1 .9H7.8a1 1 0 0 1-1-.9L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg> },
];

const navLink = { fontSize: 14.5, color: "rgba(230,230,230,.7)", textDecoration: "none" } as const;
const uppercaseEyebrow = { fontSize: 13, fontWeight: 600, letterSpacing: ".4px", textTransform: "uppercase" } as const;

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fluuy",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, WhatsApp",
    description: DESCRIPTION,
    url: SITE_URL,
    offers: { "@type": "Offer", category: "SaaS" },
  };

  return (
    <div className="fl-root" data-screen-label="Fluuy landing" style={{ background: "#282926" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ░░ NAV ░░ */}
      <header style={{ position: "sticky", top: 0, zIndex: 60, backdropFilter: "blur(16px) saturate(150%)", background: "rgba(40,41,38,.74)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "13px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <a href="#topo" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/logo-icon.png" alt="Fluuy" width={32} height={32} style={{ borderRadius: 9, display: "block" }} />
            <span style={{ fontSize: 21, fontWeight: 600, color: "#e6e6e6", letterSpacing: "-.4px" }}>fluuy</span>
          </a>
          <nav className="fl-nav-links" style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <a href="#recursos" className="fl-nav-link" style={navLink}>Recursos</a>
            <a href="#como" className="fl-nav-link" style={navLink}>Como funciona</a>
            <a href="#resultados" className="fl-nav-link" style={navLink}>Resultados</a>
            <a href="#faq" className="fl-nav-link" style={navLink}>Dúvidas</a>
          </nav>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="fl-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#d6f272", color: "#282926", fontWeight: 600, fontSize: 14, padding: "10px 17px", borderRadius: 9, textDecoration: "none" }}>
            <WhatsAppIcon size={17} />
            Falar no WhatsApp
          </a>
        </div>
      </header>

      {/* ░░ HERO ░░ */}
      <section id="topo" data-screen-label="Hero" style={{ position: "relative", overflow: "clip", background: "radial-gradient(120% 90% at 80% -10%,#34352f 0%,#282926 55%)" }}>
        <div style={{ position: "absolute", top: -140, right: -60, width: 540, height: 540, borderRadius: "50%", background: "radial-gradient(circle,rgba(214,242,114,.20),transparent 68%)", filter: "blur(14px)", animation: "fl-float 9s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -180, left: -120, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,rgba(214,242,114,.10),transparent 70%)", filter: "blur(18px)", animation: "fl-float2 11s ease-in-out infinite", pointerEvents: "none" }} />
        <div className="fl-hero-grid" style={{ position: "relative", maxWidth: 1200, margin: "0 auto", padding: "84px 32px 104px", display: "grid", gridTemplateColumns: "1.08fr .92fr", gap: 56, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(214,242,114,.11)", border: "1px solid rgba(214,242,114,.3)", color: "#d6f272", fontSize: 13, fontWeight: 500, padding: "7px 13px", borderRadius: 999, marginBottom: 26 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d6f272", animation: "fl-pulse 2s infinite" }} />
              Atendimento automático no WhatsApp
            </div>
            <h1 style={{ fontSize: "clamp(40px,5.2vw,62px)", lineHeight: 1.03, fontWeight: 600, letterSpacing: "-1.8px", color: "#fff", margin: "0 0 22px" }}>
              Seu WhatsApp respondendo <span style={{ color: "#d6f272" }}>sozinho</span>, 24 horas por dia.
            </h1>
            <p style={{ fontSize: 18.5, lineHeight: 1.56, color: "rgba(230,230,230,.72)", margin: "0 0 34px", maxWidth: "33ch" }}>
              A Fluuy cria um agente de IA que conversa com seus clientes, tira dúvidas, agenda e fecha vendas no seu WhatsApp. Sem deixar ninguém esperando.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 34 }}>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="fl-btn-hero" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#d6f272", color: "#282926", fontWeight: 600, fontSize: 15.5, padding: "15px 24px", borderRadius: 11, textDecoration: "none" }}>
                <WhatsAppIcon size={19} />
                Falar no WhatsApp
              </a>
              <a href="#como" className="fl-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.04)", color: "#e6e6e6", border: "1px solid rgba(255,255,255,.16)", fontWeight: 500, fontSize: 15.5, padding: "15px 22px", borderRadius: 11, textDecoration: "none" }}>
                Ver como funciona
              </a>
            </div>
          </div>
          <ChatMock />
        </div>
      </section>

      {/* ░░ PROVA SOCIAL ░░ */}
      <section data-screen-label="Prova social" style={{ background: "#f3f2ef", color: "#282926", padding: "52px 0", borderBottom: "1px solid #e4e2dc" }}>
        <p style={{ textAlign: "center", ...uppercaseEyebrow, color: "rgba(40,41,38,.42)", margin: "0 0 30px" }}>Nichos impactados</p>
        <div style={{ overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)" }}>
          <div style={{ display: "flex", gap: 58, width: "max-content", animation: "fl-marquee 30s linear infinite" }}>
            {[...NICHES, ...NICHES].map((n, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 21, fontWeight: 600, color: "rgba(40,41,38,.46)", letterSpacing: "-.4px", whiteSpace: "nowrap" }}>
                {n.icon}{n.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ░░ COMO FUNCIONA ░░ */}
      <section id="como" data-screen-label="Como funciona" style={{ background: "#fff", color: "#282926", padding: "118px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ maxWidth: 680 }}>
            <span style={{ ...uppercaseEyebrow, color: "#7e8a52" }}>Como funciona</span>
            <h2 style={{ fontSize: "clamp(30px,3.6vw,44px)", fontWeight: 600, letterSpacing: "-1.2px", lineHeight: 1.08, margin: "14px 0 16px" }}>Do zero ao atendimento automático em minutos</h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: "rgba(40,41,38,.6)", margin: 0 }}>Sem instalar nada, sem trocar de número. Você conecta, configura em linguagem natural e deixa a Fluuy assumir a conversa.</p>
          </div>
          <StepsGrid />
        </div>
      </section>

      {/* ░░ RECURSOS ░░ */}
      <section id="recursos" data-screen-label="Recursos" style={{ background: "#e9e8e4", color: "#282926", padding: "118px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
            <span style={{ ...uppercaseEyebrow, color: "#7e8a52" }}>Recursos</span>
            <h2 style={{ fontSize: "clamp(30px,3.6vw,44px)", fontWeight: 600, letterSpacing: "-1.2px", lineHeight: 1.08, margin: "14px 0 16px" }}>Tudo o que um bom atendente faz, sem pausa pro café</h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: "rgba(40,41,38,.6)", margin: 0 }}>A Fluuy cuida da conversa do início ao fim e chama você só quando realmente precisa.</p>
          </div>
          <FeaturesGrid />
        </div>
      </section>

      {/* ░░ DEMO + MÉTRICAS (dark) ░░ */}
      <section data-screen-label="Demo" style={{ background: "#282926", color: "#e6e6e6", padding: "118px 0 96px", position: "relative", overflow: "clip" }}>
        <div style={{ position: "absolute", top: 60, left: -100, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(214,242,114,.08),transparent 70%)", filter: "blur(20px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
          <div className="fl-demo-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
            <div>
              <span style={{ ...uppercaseEyebrow, color: "#d6f272" }}>Veja na prática</span>
              <h2 style={{ fontSize: "clamp(30px,3.6vw,44px)", fontWeight: 600, letterSpacing: "-1.2px", lineHeight: 1.08, color: "#fff", margin: "14px 0 18px" }}>A Fluuy atendendo de verdade, do &ldquo;oi&rdquo; ao agendamento</h2>
              <p style={{ fontSize: 18, lineHeight: 1.55, color: "rgba(230,230,230,.66)", margin: "0 0 32px" }}>Ela entende o pedido, sugere o melhor horário e registra tudo sozinha — enquanto você cuida do seu negócio.</p>
              <PracticeList />
            </div>
            <ConvoDemo />
          </div>
          <Metrics />
        </div>
      </section>

      {/* ░░ FAQ ░░ */}
      <section id="faq" data-screen-label="FAQ" style={{ background: "#fff", color: "#282926", padding: "118px 0" }}>
        <div className="fl-faq-grid" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: 54 }}>
          <div>
            <span style={{ ...uppercaseEyebrow, color: "#7e8a52" }}>Dúvidas frequentes</span>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,40px)", fontWeight: 600, letterSpacing: "-1.1px", lineHeight: 1.1, margin: "14px 0 18px" }}>Tudo o que você quer saber antes de começar</h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "rgba(40,41,38,.6)", margin: "0 0 22px" }}>Não achou sua dúvida? Chama a gente no WhatsApp.</p>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="fl-faq-cta" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#282926", color: "#d6f272", fontWeight: 600, fontSize: 14.5, padding: "12px 18px", borderRadius: 10, textDecoration: "none" }}>
              <WhatsAppIcon size={17} />
              Falar no WhatsApp
            </a>
          </div>
          <Faq />
        </div>
      </section>

      {/* ░░ CTA FINAL ░░ */}
      <section id="cta" data-screen-label="CTA" style={{ position: "relative", overflow: "clip", background: "#d6f272", color: "#282926", padding: "110px 0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/logo-light.png" alt="" aria-hidden="true" style={{ position: "absolute", top: -40, right: -30, width: 280, height: 280, opacity: 0.16, animation: "fl-float 10s ease-in-out infinite", pointerEvents: "none" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/logo-light.png" alt="" aria-hidden="true" style={{ position: "absolute", bottom: -60, left: -40, width: 220, height: 220, opacity: 0.1, animation: "fl-float2 12s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px,4.4vw,52px)", fontWeight: 600, letterSpacing: "-1.6px", lineHeight: 1.06, margin: "0 0 18px" }}>Pronto pra nunca mais deixar um cliente esperando?</h2>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: "rgba(40,41,38,.7)", margin: "0 0 32px" }}>Configure seu agente hoje e veja a Fluuy respondendo já nas próximas conversas.</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="fl-cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#282926", color: "#d6f272", fontWeight: 600, fontSize: 17, padding: "17px 30px", borderRadius: 13, textDecoration: "none" }}>
            <WhatsAppIcon size={20} />
            Falar no WhatsApp
          </a>
          <div style={{ maxWidth: 460, margin: "30px auto 0" }}>
            <LeadForm />
          </div>
          <p style={{ fontSize: 14, color: "rgba(40,41,38,.55)", margin: "18px 0 0" }}>Resposta em minutos · Sem compromisso</p>
        </div>
      </section>

      {/* ░░ FOOTER ░░ */}
      <footer style={{ background: "#282926", color: "#e6e6e6", padding: "64px 0 34px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
        <div className="fl-footer-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/logo-icon.png" alt="Fluuy" width={28} height={28} style={{ borderRadius: 8, display: "block" }} />
              <span style={{ fontSize: 20, fontWeight: 600, color: "#e6e6e6", letterSpacing: "-.4px" }}>fluuy</span>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "rgba(230,230,230,.55)", margin: 0, maxWidth: "30ch" }}>Atendimento automático no WhatsApp para quem não quer perder cliente.</p>
          </div>
          <FooterCol title="Produto" links={[["Recursos", "#recursos"], ["Como funciona", "#como"], ["Resultados", "#resultados"]]} />
          <FooterCol title="Empresa" links={[["Sobre", "#"], ["Blog", "#"], ["Dúvidas", "#faq"]]} />
          <FooterCol title="Suporte" links={[["WhatsApp", WHATSAPP_URL], ["Central de ajuda", "#"], ["Status", "#"]]} />
        </div>
        <div style={{ maxWidth: 1200, margin: "44px auto 0", padding: "22px 32px 0", borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, color: "rgba(230,230,230,.4)" }}>© 2026 Fluuy · Feito no Brasil</span>
          <div style={{ display: "flex", gap: 22 }}>
            <a href="#" className="fl-footer-link" style={{ fontSize: 13, color: "rgba(230,230,230,.4)", textDecoration: "none" }}>Privacidade</a>
            <a href="#" className="fl-footer-link" style={{ fontSize: 13, color: "rgba(230,230,230,.4)", textDecoration: "none" }}>Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", color: "rgba(230,230,230,.4)", marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map(([label, href]) => {
          const external = href.startsWith("http");
          return (
            <a
              key={label}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="fl-footer-link"
              style={{ fontSize: 14.5, color: "rgba(230,230,230,.7)", textDecoration: "none" }}
            >
              {label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
