# Changelog

Todas as mudanças relevantes do HabitFlow ficam registradas aqui, no formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), com versões em [SemVer](https://semver.org/lang/pt-BR/). Cada release publicada no GitHub tem a sua seção.

## [Não publicado]

## [2.0.0] - 2026-11-07

### Adicionado
- Cadastro, login e JWT HS256 com `crypto` nativo; cada usuário vê e altera só os próprios hábitos (#63).
- Telas de entrar e criar conta, sessão e botão Sair no dashboard (#63).
- Exportação de um mês em CSV por `GET /api/habits/export` e pelo botão "Baixar CSV" (#65).
- Lembrete diário opcional por e-mail com os hábitos pendentes, via SMTP (#67).
- `Dockerfile` e `docker-compose.yml` com volume para o banco (#78).
- ESLint e hook de pre-commit com lint e testes (#76).
- Cobertura mínima de 85% das linhas no CI (#68).
- Varredura de segredos com gitleaks e `npm audit` no CI (#72).
- Dependabot semanal para npm e GitHub Actions (#73).
- `.env.example` e tabela de variáveis de ambiente (#74).
- Templates de issue e de PR (#70), `CONTRIBUTING.md` (#71), índice de `docs/` (#75) e este changelog (#69).

### Alterado
- **Quebra de contrato:** todas as rotas `/api/habits*` exigem `Authorization: Bearer <token>` (#63).
- **Quebra de contrato:** erros da API passam a ser `{ error: { code, message, fields } }`; erro 500 não expõe mais a mensagem interna (#77).
- Persistência migrada de `data/habits.json` para SQLite com `node:sqlite`; os dados da versão anterior não são migrados (#66).
- Node.js mínimo passa a ser 22.13 (#66).
- Conta nova começa sem hábitos; os 3 de exemplo ficam só na demo do GitHub Pages (#63).
- Matriz de rastreabilidade estendida aos testes e aos RNFs (#64).

### Removido
- Adapter de armazenamento em arquivo JSON (#66).

### Corrigido
- Workflow do GitHub Pages instala as dependências antes dos testes (#95).

## [1.2.0] - 2026-11-06

### Alterado
- Redesign da interface: tema escuro sóbrio, ícones SVG, check-in acessível e layout responsivo (#59).

## [1.1.2] - 2026-11-06

### Alterado
- Remoção de emojis dos documentos de `docs/` (#55).

## [1.1.1] - 2026-11-06

### Alterado
- Arquitetura e diagramas atualizados após o modo demonstração (#51).

## [1.1.0] - 2026-11-06

### Adicionado
- Modo demonstração no GitHub Pages com dados no `localStorage` do navegador e deploy automático (#46).

### Alterado
- Adapter de armazenamento e roteador da API extraídos do servidor HTTP (#45).

## [1.0.2] - 2026-11-06

### Corrigido
- Referência de issue da v1.0.1 no README (#38).

## [1.0.1] - 2026-11-06

### Alterado
- Remoção de emojis do README (#38).

## [1.0.0] - 2026-11-06

### Adicionado
- Dashboard web responsivo consumindo a API (#13).
- Testes de integração HTTP e pipeline de CI no GitHub Actions (#14).
- README com guia de execução, badges e fluxo de branches (#15).

## [0.2.0] - 2026-11-06

### Adicionado
- API REST: cadastro e validação (#7), listagem com filtros (#8), edição e exclusão (#9), check-in diário (#10).
- Cálculo de ofensiva atual e recorde, e estatísticas do dia (#11).
- Persistência em arquivo JSON com hábitos de exemplo (#12).

## [0.1.0] - 2026-11-06

### Adicionado
- Estrutura inicial do projeto (#1), termo de abertura (#2), requisitos (#3), casos de uso (#4), user stories (#5) e arquitetura (#6).

[Não publicado]: https://github.com/Molimpion/habit-tracker/compare/v2.0.0...develop
[2.0.0]: https://github.com/Molimpion/habit-tracker/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/Molimpion/habit-tracker/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/Molimpion/habit-tracker/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/Molimpion/habit-tracker/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/Molimpion/habit-tracker/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/Molimpion/habit-tracker/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Molimpion/habit-tracker/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Molimpion/habit-tracker/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/Molimpion/habit-tracker/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Molimpion/habit-tracker/releases/tag/v0.1.0
