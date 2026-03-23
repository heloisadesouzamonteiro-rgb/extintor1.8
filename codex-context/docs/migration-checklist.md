# Checklist de migracao de conta no Codex

## Pode reaproveitar

- pasta do projeto
- `codex-context/preferences/config.toml.example`
- `codex-context/skills/`
- `.env.example`
- documentacao do projeto

## Precisa recriar ou copiar manualmente

- login da nova conta no Codex
- tokens e segredos locais
- acessos a Supabase, Google e deploy
- preferencias locais nao exportadas

## Nao vale copiar como estrategia de migracao

- `C:\Users\Murilo\.codex\auth.json`
- `C:\Users\Murilo\.codex\sessions\`
- `C:\Users\Murilo\.codex\sqlite\`
- `C:\Users\Murilo\.codex\state_*.sqlite`

## Fluxo recomendado

1. Abrir o projeto na nova conta.
2. Configurar o `config.toml` da nova conta com base no exemplo.
3. Levar skills personalizadas do projeto para a nova conta.
4. Preencher os arquivos locais com segredos.
5. Validar login, acesso ao backend e build do projeto.
