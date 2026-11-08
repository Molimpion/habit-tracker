# HabitFlow — Gerenciador de Hábitos e Consistência Diária

[![Versão](https://img.shields.io/github/v/tag/Molimpion/habit-tracker?label=vers%C3%A3o&sort=semver)](https://github.com/Molimpion/habit-tracker/releases)
[![Licença](https://img.shields.io/github/license/Molimpion/habit-tracker?label=licen%C3%A7a)](./LICENSE)
[![CI](https://github.com/Molimpion/habit-tracker/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Molimpion/habit-tracker/actions/workflows/ci.yml)
[![Pages](https://github.com/Molimpion/habit-tracker/actions/workflows/pages.yml/badge.svg?branch=main)](https://molimpion.github.io/habit-tracker/)
![Node.js](https://img.shields.io/badge/node-%3E%3D22.13.0-339933.svg)
![Git Flow](https://img.shields.io/badge/workflow-Git%20Flow%20%2B%20SemVer-orange.svg)

O **HabitFlow** é uma aplicação web full-stack (API RESTful + Dashboard Interativo) projetada para auxiliar estudantes e profissionais na construção e manutenção de hábitos diários. Ele resolve o problema da falta de visibilidade sobre a consistência pessoal, permitindo cadastrar hábitos por categoria, registrar *check-ins* diários com apenas **1 clique** e acompanhar automaticamente a ofensiva atual (*current streak*), o recorde histórico (*best streak*) e a taxa percentual de metas cumpridas no dia.

Este projeto foi desenvolvido aplicando rigorosamente o **Ciclo de Vida de Desenvolvimento de Software (SDLC)**: desde o Termo de Abertura (*Project Charter*), Engenharia de Requisitos (RF/RNF), Casos de Uso e *User Stories* em BDD/Gherkin até o desdobramento em **15 Issues rastreáveis**, **Git Flow**, **Commits Atômicos (Conventional Commits)** e **Versionamento Semântico (SemVer)**.

## Demonstração Online

**https://molimpion.github.io/habit-tracker/**

O GitHub Pages só serve arquivos estáticos, então a versão publicada roda em **modo demonstração**: o mesmo `HabitService`, o mesmo roteador da API e o mesmo cálculo de *streaks* do backend são carregados no navegador, e um `fetch` substituto encaminha as chamadas `/api/*` para eles. Os dados ficam no `localStorage` de quem acessa, sem servidor. Para usar a API Node com persistência em SQLite, siga a execução local abaixo.

---

## Documentação de Engenharia (`docs/`)

Todos os artefatos formais de especificação e modelagem encontram-se na pasta `docs/`:

| Documento | Descrição | Link Direto |
| :--- | :--- | :--- |
| **Project Charter** | Justificativa, visão do produto, objetivos SMART, escopo (In/Out) e Stakeholders. | [`docs/project-charter.md`](./docs/project-charter.md) |
| **Requisitos (RF e RNF)** | Lista numerada e rastreável de 8 Requisitos Funcionais e 6 Requisitos Não Funcionais + Matriz de Rastreabilidade. | [`docs/requisitos.md`](./docs/requisitos.md) |
| **Casos de Uso** | Especificação de atores, diagrama Mermaid e fluxos principais, alternativos e de exceção (`UC01` a `UC05`). | [`docs/casos-de-uso.md`](./docs/casos-de-uso.md) |
| **User Stories (BDD)** | 5 Histórias de Usuário no formato canônico com Critérios de Aceite explícitos em Gherkin (*Dado/Quando/Então*). | [`docs/user-stories.md`](./docs/user-stories.md) |
| **Arquitetura e Diagramas** | Diagrama C4 de Componentes, Diagrama de Classes, Máquina de Estados de *Streaks* e Especificação da API REST. | [`docs/arquitetura-e-diagramas.md`](./docs/arquitetura-e-diagramas.md) |

---

## Sumário de Funcionalidades: Implementadas vs. Planejadas

| Funcionalidade | Requisito | Status | Versão |
| :--- | :---: | :---: | :---: |
| Cadastro de hábitos com validação de título, categoria e meta semanal | `RF01`, `RF08` | Implementado | `v0.2.0` |
| Listagem e filtragem dinâmica por categoria, status do dia e busca textual | `RF02` | Implementado | `v0.2.0` |
| Edição de hábitos existentes preservando histórico e exclusão permanente | `RF03`, `RF04` | Implementado | `v0.2.0` |
| Registro de *check-in* diário (*toggle* concluído/pendente por data ISO) | `RF05` | Implementado | `v0.2.0` |
| Cálculo automático de ofensiva atual (*current streak*) e recorde (*best streak*) | `RF06`, `RF07` | Implementado | `v0.2.0` |
| Dashboard web responsivo com cartões de estatísticas e barra de progresso | `RF07`, `RNF03` | Implementado | `v1.0.0` |
| Suíte de testes automatizados (unitários e integração HTTP) e CI no GitHub Actions | `RNF05` | Implementado | `v1.0.0` |
| Modo demonstração no GitHub Pages com dados no `localStorage` do navegador | `RNF03`, `RNF06` | Implementado | `v1.1.0` |
| Autenticação multiusuário com JWT e isolamento dos hábitos por usuário | `RF09` | Implementado | `v2.0.0` |
| Lembrete diário por e-mail com os hábitos pendentes (opt-in, via SMTP) | `RF11` | Implementado | `v2.0.0` |
| Notificações push e WhatsApp | Backlog Futuro | Planejado | — |
| Exportação mensal em CSV (data, hábito e situação de cada dia; abre direto no Excel) | `RF10` | Implementado | `v2.0.0` |
| Exportação mensal em PDF | Backlog Futuro | Planejado | — |

---

## Estrutura do Repositório

```text
habit-tracker/
├── docs/
│   ├── project-charter.md           # Termo de Abertura do Projeto (SMART, Escopo, Stakeholders)
│   ├── requisitos.md                # Requisitos Funcionais (RF01-RF08) e Não Funcionais (RNF01-RNF06)
│   ├── casos-de-uso.md              # Especificação de Casos de Uso (UC01-UC05)
│   ├── user-stories.md              # Histórias de Usuário (US01-US05) com Critérios BDD/Gherkin
│   └── arquitetura-e-diagramas.md   # Diagramas C4, Classes, Estados e Endpoints REST
├── src/
│   ├── public/                      # Interface Web Responsiva (HTML5, CSS3, JS Client)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.client.js
│   ├── reminders/
│   │   ├── reminderConfig.js        # Lê SMTP_* , MAIL_FROM e REMINDER_HOUR do ambiente
│   │   ├── reminderService.js       # Monta e envia o lembrete diário, uma vez por dia por pessoa
│   │   └── smtpMailer.js            # Envio por SMTP com nodemailer
│   ├── auth/
│   │   ├── accountRouter.js         # GET/PATCH /api/account (preferência de lembrete)
│   │   ├── authService.js           # Cadastro, login (scrypt) e validação do token
│   │   ├── authRouter.js            # Rotas /api/auth/register e /api/auth/login
│   │   └── jwt.js                   # JWT HS256 com crypto nativo
│   ├── api/
│   │   └── router.js                # Rotas /api/* como função pura (usada pelo servidor e pelo modo demo)
│   ├── services/
│   │   └── habitService.js          # Regras de negócio e validações (recebe o adapter de armazenamento)
│   ├── storage/
│   │   ├── sqliteStorage.js         # Adapter de armazenamento em SQLite com node:sqlite (Node)
│   │   └── localStorageStorage.js   # Adapter de armazenamento no localStorage (navegador)
│   ├── demo/
│   │   ├── boot.js                  # Carrega os módulos no navegador e substitui o fetch de /api/*
│   │   ├── seedHabits.js            # Hábitos de exemplo da primeira visita à demo
│   │   └── demoFetch.js             # Encaminha chamadas /api/* para o roteador
│   ├── utils/
│   │   ├── errors.js                # Erros com status HTTP e código estável (VALIDATION_ERROR, NOT_FOUND...)
│   │   └── streakCalculator.js      # Motor matemático de cálculo de streaks e datas
│   ├── app.js                       # Servidor HTTP: CORS, leitura do corpo e arquivos estáticos
│   └── server.js                    # Ponto de entrada da aplicação
├── scripts/
│   └── build-pages.sh               # Monta o site do modo demonstração em _site/
├── tests/
│   ├── habit.test.js                # Testes automatizados (Unitários + API REST)
│   ├── auth.test.js                 # JWT, cadastro, login e isolamento entre usuários
│   ├── reminder.test.js             # Lembrete por e-mail, configuração e preferência da conta
│   └── demo.test.js                 # Testes do modo demonstração e do adapter do navegador
├── data/
│   └── .gitkeep                     # Diretório do banco local (habitflow.db)
├── .githooks/pre-commit            # Lint e testes antes de cada commit (ativado pelo npm install)
├── .github/workflows/ci.yml         # Pipeline de CI (lint e testes em Node 22)
├── .github/workflows/pages.yml      # Testa, monta e publica o modo demonstração no GitHub Pages
├── Dockerfile                       # Imagem Node 22 alpine, usuário não-root, sem dependências de desenvolvimento
├── docker-compose.yml               # Serviço da aplicação com volume para o banco SQLite
├── .gitignore                       # Arquivos e pastas ignorados pelo Git
├── eslint.config.js                 # Regras do ESLint (Node e navegador)
├── LICENSE                          # Licença MIT
├── package.json                     # Manifesto do projeto e scripts npm
└── README.md                        # Documentação principal e guia do projeto
```

---

## Configuração de Ambiente, Instalação e Execução Local

### Pré-requisitos
- **Node.js** versão `22.13.0` ou superior instalado ([https://nodejs.org/](https://nodejs.org/)).
- **Git** instalado.

> **Portabilidade Total (`RNF06`):** Em execução, o projeto usa apenas módulos nativos do Node.js (`node:http`, `node:fs`, `node:crypto`, `node:sqlite`, `node:test`), sem dependências npm nem servidor de banco de dados: o SQLite é um arquivo em `data/habitflow.db` (caminho configurável em `DATABASE_FILE`). No Node 22, o `node:sqlite` exibe um aviso de recurso experimental ao iniciar. A única dependência de execução é o `nodemailer`, usado só pelo lembrete por e-mail; o ESLint é dependência de desenvolvimento, usada no lint e no hook de pre-commit.

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/Molimpion/habit-tracker.git
   cd habit-tracker
   ```

2. **Instale as dependências de desenvolvimento** (também ativa o hook de pre-commit em `.githooks/`, que roda lint e testes antes de cada commit):
   ```bash
   npm install
   ```

3. **Execute o lint e a suíte de testes automatizados:**
   ```bash
   npm run lint
   npm test
   ```

4. **Inicie o servidor da aplicação.** O servidor não sobe sem a variável `JWT_SECRET`, que assina os tokens de login. O `npm start` lê as variáveis do arquivo `.env` na raiz, se ele existir; também dá para defini-la no próprio comando:
   ```bash
   JWT_SECRET="um-segredo-longo-e-aleatorio" npm start
   ```

5. **Acesse no navegador:**
   - **Dashboard Web Interativo:** `http://localhost:3000`
   - **Healthcheck da API:** `http://localhost:3000/api/health`
   - **Estatísticas JSON:** `http://localhost:3000/api/habits/stats`

### Lembrete por e-mail (opcional)

Quem marca "Lembrete por e-mail" no topo do dashboard recebe, a partir das 20h, um e-mail por dia com os hábitos ainda pendentes; sem pendência, nada é enviado. O servidor verifica a cada minuto e grava a data do último envio no banco, então reiniciar não repete o e-mail. Para ligar, defina `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM` (e, se quiser, `REMINDER_HOUR`, de 0 a 23). Sem elas o servidor sobe normalmente, com os lembretes desligados e um aviso no terminal. O horário segue o fuso do servidor; no Docker, a variável `TZ` (padrão `America/Recife`).

### Execução com Docker

Não exige Node instalado, só Docker com o Compose:

```bash
docker compose up -d --build
```

O compose exige `JWT_SECRET`, lida do ambiente ou do arquivo `.env` na raiz. O dashboard abre em `http://localhost:3000` (para usar outra porta: `HOST_PORT=8080 docker compose up -d`). O banco SQLite fica no volume `habitflow-data` e sobrevive a `docker compose down`; `docker compose down -v` apaga os dados.

---

## Fluxo de Branches Adotado (Git Flow) e Versionamento Semântico

O desenvolvimento segue o modelo **Git Flow** combinado com **Conventional Commits** e **SemVer**. Nenhum commit é feito direto em `main` ou `develop`: toda mudança entra por **Pull Request** que referencia a issue (`Closes #N`).

1. Cada issue ganha uma branch `feature/issue-NN-descricao` criada a partir de `develop`.
2. A branch volta para `develop` por Pull Request, depois do CI verde.
3. Num marco estável, uma branch `release/vX.Y.Z` sai de `develop`, atualiza a versão no `package.json` e é integrada em `main` por Pull Request.
4. O merge em `main` recebe uma **tag anotada** SemVer e uma Release no GitHub; a branch de release volta para `develop`.

```mermaid
gitGraph
    commit id: "initial"
    branch develop
    checkout develop
    branch feature/issue-01
    commit id: "chore(setup)"
    checkout develop
    merge feature/issue-01
    branch feature/issue-02
    commit id: "docs(...)"
    checkout develop
    merge feature/issue-02
    branch release/v0.1.0
    commit id: "chore(release): v0.1.0"
    checkout main
    merge release/v0.1.0 tag: "v0.1.0"
    checkout develop
    merge release/v0.1.0
    branch feature/issue-07
    commit id: "feat(...)"
    checkout develop
    merge feature/issue-07
    branch release/v0.2.0
    commit id: "chore(release): v0.2.0"
    checkout main
    merge release/v0.2.0 tag: "v0.2.0"
```

### Tabela de Branches e Releases

| Branch / Tag | Tipo | Objetivo e Rastreabilidade |
| :--- | :---: | :--- |
| `main` | Produção | Contém apenas código estável, integrado por Pull Request de uma branch `release/*` e marcado com tag SemVer. |
| `develop` | Integração | Branch base de desenvolvimento onde todas as branches `feature/issue-*` são integradas por Pull Request. |
| `release/vX.Y.Z` | Release | Atualiza a versão no `package.json` e leva `develop` para `main`. |
| `feature/issue-01-setup-projeto` | Feature/Chore | Configuração inicial da estrutura de pastas, `.gitignore` e `package.json` (`Closes #1`). |
| `feature/issue-02-project-charter` | Docs | Elaboração do Termo de Abertura do Projeto (`Closes #2`). |
| `feature/issue-03-requisitos` | Docs | Especificação dos Requisitos Funcionais e Não Funcionais (`Closes #3`). |
| `feature/issue-04-casos-de-uso` | Docs | Modelagem dos Casos de Uso `UC01` a `UC05` (`Closes #4`). |
| `feature/issue-05-user-stories` | Docs | Escrita das Histórias de Usuário em BDD/Gherkin (`Closes #5`). |
| `feature/issue-06-arquitetura-diagramas` | Docs | Diagramas C4, Classes e Estados em Mermaid (`Closes #6`). |
| `feature/issue-07-api-cadastro-habito` | Feature | Implementação do cadastro e validação de hábitos `[RF01, RF08]` (`Closes #7`). |
| `feature/issue-08-api-listagem-filtro` | Feature | Listagem de hábitos com filtro por categoria, status e busca `[RF02]` (`Closes #8`). |
| `feature/issue-09-api-edicao-exclusao` | Feature | Endpoints e regras de edição e exclusão de hábitos `[RF03, RF04]` (`Closes #9`). |
| `feature/issue-10-api-checkin-diario` | Feature | Registro e alternância (*toggle*) de *check-in* por data `[RF05]` (`Closes #10`). |
| `feature/issue-11-calculo-streaks` e `feature/issue-11-estatisticas-dashboard` | Feature | Algoritmo de cálculo de ofensivas (*streaks*) e endpoint de estatísticas `[RF06, RF07]` (`Refs #11` / `Closes #11`). |
| `feature/issue-12-persistencia-json` | Feature | Camada de persistência automática em arquivo JSON e *seed* inicial `[RNF02]` (`Closes #12`). |
| `feature/issue-13-interface-web-dashboard` | Feature | Construção do Frontend responsivo consumindo a API `[RNF03]` (`Closes #13`). |
| `feature/issue-14-testes-integracao-ci` | Test | Testes de integração HTTP e pipeline de CI no GitHub Actions `[RNF05]` (`Closes #14`). |
| `feature/issue-15-readme-documentacao-final` | Docs | Consolidação do `README.md`, badges, guia de execução e revisão final (`Closes #15`). |

### Histórico de Releases (SemVer)
- **`v0.1.0`** — *Milestone 1: Especificação e Documentação de Engenharia Completa* (Issues `#1` a `#6`).
- **`v0.2.0`** — *Milestone 2: Core Backend API REST, Persistência e Cálculo de Streaks* (Issues `#7` a `#12`).
- **`v1.0.0`** — *Milestone 3: Release Final MVP com Dashboard Web e Testes Automatizados* (Issues `#13` a `#15`).
- **`v1.0.1`** — *Patch de documentação: remoção de emojis do README* (Issue `#38`).
- **`v1.0.2`** — *Patch de documentação: correção da referência de issue da v1.0.1* (Issue `#38`).
- **`v1.1.0`** — *Modo demonstração no GitHub Pages: adapter de armazenamento, roteador da API extraído e deploy automático* (Issues `#45` e `#46`).
- **`v1.1.1`** — *Patch de documentação: arquitetura e diagramas atualizados* (Issue `#51`).
- **`v1.1.2`** — *Patch de documentação: remoção de emojis dos documentos de `docs/`* (Issue `#55`).
- **`v1.2.0`** — *Redesign da interface: tema escuro sóbrio, ícones SVG, check-in acessível e layout responsivo* (Issue `#59`).
