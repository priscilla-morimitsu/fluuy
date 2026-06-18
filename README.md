# Fluuy

Plataforma SaaS multi-tenant e multi-nicho para automação de atendimento via agentes de IA (WhatsApp/Pilot Status). Ver `.claude/docs/` para PRD e specs completas.

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Prisma + PostgreSQL + Auth.js (senha, Google OAuth, código por e-mail/WhatsApp) + Docker.

## Autenticação

Sem auto-cadastro: tenants e usuários só são criados pelo platform admin (`/admin`). A tela
de login (`/login`) oferece senha, código por e-mail (Resend) e código por WhatsApp (Pilot
Status), além de "Entrar com Google" — que só funciona para um e-mail já cadastrado e ativo,
nunca cria conta nova. O botão "Quero usar o Fluuy" cria apenas um `Lead` comercial.

Fluxos adicionais: `/forgot-password` + `/reset-password` (reset de senha), `/set-password`
(primeira senha de usuário convidado, após login via código), `/account/security` (alterar
senha logado), `/select-tenant` (quando o usuário pertence a mais de um tenant ativo).

Variáveis necessárias para os provedores externos (preencha no `.env`):
`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (Google OAuth), `RESEND_API_KEY`/`RESEND_FROM_EMAIL`
(e-mail), `PILOT_STATUS_API_KEY` (ou `PILOT_STATUS_API_KEY_ID`)/`PILOT_STATUS_OTP_TEMPLATE_ID`
(WhatsApp — o template no dashboard da Pilot Status deve ser categoria OTP com as variáveis
`{{otp_code}}` e `{{expiry_minutes}}`, nesses nomes exatos; ver `verification_code` no
dashboard). Testado de ponta a ponta com envio real por e-mail e WhatsApp.

## Setup local

```bash
cp .env.example .env   # preencha DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), etc.
npm install
docker compose up -d fluuy_db     # Postgres local, porta 5433 (5432 costuma já estar em uso)
npm run db:migrate                # aplica as migrations
npm run db:seed                   # cria o platform admin (SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD opcionais)
npm run dev                       # http://localhost:3000
```

Login padrão do seed: `admin@fluuy.com` / `changeme123` (sobrescreva via env vars em produção/staging).

## Stack completa via Docker (local)

```bash
docker compose up -d --build
curl http://localhost:3001/api/health
```

Esse `docker-compose.yml` é **somente para desenvolvimento local**. Em produção, a VPS Hostinger compartilhada usa o compose em `../deploy/docker-compose.yml` (serviço `fluuy`, proxy nginx em `../deploy/nginx/conf.d/fluuy.conf`), com um Postgres gerenciado externamente — não o container `fluuy_db` deste repo.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `start` | build e start de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:migrate:deploy` | `prisma migrate deploy` (produção) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | cria/atualiza o platform admin |

## Guard-rails de IA

Regras, skills, agentes e hooks de desenvolvimento assistido por IA vivem em `.devrails/` (fonte) e são projetados para `CLAUDE.md` + `.claude/`. Ver `CLAUDE.md` para as convenções sempre-ativas (segurança, multi-tenant, code standards).
