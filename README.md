# SoftHub

Sistema de gestão de equipes, tarefas e ponto eletrônico.
Stack: React/Vite (frontend) · Hono/Cloudflare Workers (backend) · D1/KV (dados)

## Pré-requisitos

- Node.js >= 18
- Wrangler CLI: `npm install -g wrangler`
- Conta Cloudflare com Workers e D1 habilitados

## Setup local

```bash
# 1. Clonar e instalar
git clone <repo>
cd softhub
npm install

# 2. Configurar variáveis
cp .env.example .env
# edite .env com seus valores (veja seção abaixo)

# 3. Rodar migrations do banco
# Para desenvolvimento local (SQLite no Worker):
cd back-end
npm run db:init # se disponível, ou use wrangler d1 execute

# 4. Iniciar desenvolvimento
# Terminal 1: Frontend
cd front-end
npm run dev

# Terminal 2: Backend
cd back-end
npm run dev
```

## Estrutura

```
back-end/
  src/
    rotas/          ← definição de rotas (Hono)
    servicos/       ← lógica de negócio (independente de transporte)
    repositorios/   ← queries SQL isoladas (D1)
    middleware/     ← auth, permissão, rate-limit, logs
    db/             ← migrations e schema SQL
    utilitarios/    ← logger, paginação, csv, formatadores

front-end/
  src/
    funcionalidades/ ← módulos de negócio (Kanban, Ponto, etc.)
    compartilhado/   ← componentes, hooks e serviços reutilizáveis
    contexto/        ← contexto de autenticação global
    configuracoes/   ← rotas, msal e variáveis de ambiente
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa.
Para o backend, use `.dev.vars` localmente para segredos e `wrangler secret put <NOME>` para produção.
Para o frontend, use `.env` com prefixo `VITE_`.

## Deploy

```bash
# Backend
cd back-end
npm run deploy

# Frontend
cd front-end
npm run build
# (Deploy via Cloudflare Pages)
```

---

*Fábrica de Software — Unieuro*
