# SaaS Extintores

Aplicacao React + Vite para operacao do sistema SaaS Extintores, com autenticacao e dados no Supabase.

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior

## Configuracao local

1. Copie `.env.example` para `.env`.
2. Preencha as variaveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_SHEETS_WEBHOOK_URL` (opcional)
3. Instale as dependencias com `npm install`.
4. Rode o projeto com `npm run dev`.

## Build de producao

```bash
npm run build
```

Os arquivos finais sao gerados em `dist/`.

## Publicacao no servidor

- Garanta que as variaveis de ambiente de producao estejam configuradas no servidor.
- Em servidores com SPA, configure fallback para `index.html`.
- Existe um exemplo de configuracao em `easypanel.nginx.conf.example`.

## Supabase

O projeto inclui:

- migrations em `supabase/migrations`
- edge functions em `supabase/functions`

Scripts de deploy das functions estao no `package.json`.

## Observacoes para Git

- `.env`, `.env.production`, `node_modules` e `dist` estao ignorados.
- A pasta `extintor1.1/` foi tratada como copia local antiga e nao entra no repositório novo.
