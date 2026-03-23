# Codex Context

Esta pasta existe para facilitar a troca de conta no Codex sem perder o contexto operacional do projeto.

O que deve ficar aqui:
- preferencias portateis do Codex
- skills personalizadas do projeto
- modelos de variaveis de ambiente
- documentacao curta para onboarding de uma nova conta

O que nao deve ficar aqui:
- `auth.json`
- sessoes, historico e bancos `sqlite`
- tokens reais commitados no Git

## Estrutura

- `preferences/`
  Preferencias locais exportaveis do Codex.
- `skills/`
  Skills do projeto que voce quiser reutilizar em outra conta.
- `private/`
  Arquivos locais com segredo real. Esta pasta esta no `.gitignore`.
- `docs/`
  Contexto de negocio e instrucoes de migracao.

## Como usar em outra conta

1. Abrir esta mesma pasta do projeto na nova conta.
2. Copiar o arquivo `preferences/config.toml.example` para o `CODEX_HOME` da nova conta como `config.toml`, se fizer sentido.
3. Copiar skills personalizadas de `codex-context/skills/` para a pasta de skills da nova conta.
4. Preencher `codex-context/private/.env.codex.local` com tokens, chaves e acessos necessarios.
5. Garantir que o projeto tenha os `.env` corretos para rodar.

## Limite importante

Trocar de conta nao reaproveita automaticamente autenticacao, historico e memoria interna do Codex. O que esta nesta pasta ajuda a reconstruir o contexto do projeto, nao a clonar a sessao da conta anterior.
