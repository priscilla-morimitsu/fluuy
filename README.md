# Fluuy

Plataforma SaaS multi-tenant e multi-nicho para automação de atendimento via agentes de IA (WhatsApp/Pilot Status). Ver `.claude/docs/` para PRD e specs completas.

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Prisma + PostgreSQL + Auth.js (Credentials) + Docker.

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
