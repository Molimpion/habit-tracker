# Project Charter (Termo de Abertura do Projeto)

**Nome do Projeto:** HabitFlow — Sistema de Gerenciamento e Monitoramento de Hábitos Diários  
**Versão do Documento:** 1.0.0  
**Data:** Novembro de 2026  

---

## 1. Justificativa e Visão Geral do Produto

### 1.1 Problema
Construir e manter hábitos saudáveis (como estudar programação diariamente, praticar exercícios físicos, ler ou beber água) é um desafio recorrente para estudantes e profissionais. A ausência de um acompanhamento visual simples e de métricas claras de consistência (*streaks* ou sequências de dias consecutivos) leva frequentemente ao abandono precoce das metas estabelecidas. Ferramentas existentes no mercado costumam ser excessivamente complexas, pagas ou repletas de distrações que dificultam o registro rápido do dia a dia.

### 1.2 Visão Geral do Produto
O **HabitFlow** é uma aplicação web enxuta e API RESTful voltada para o rastreamento diário de hábitos pessoais. O sistema permite que o usuário cadastre seus hábitos, defina categorias e metas semanais, realize *check-ins* diários com um único clique e acompanhe estatísticas em tempo real sobre sua ofensiva atual (*current streak*), recorde de consistência (*best streak*) e taxa de conclusão.

---

## 2. Objetivos SMART do Software

Os objetivos do projeto foram definidos seguindo a metodologia **SMART** (*Specific, Measurable, Achievable, Relevant, Time-bound*):

1. **Específico (Specific):** Desenvolver uma aplicação web full-stack (API REST em Node.js/Express + Interface Web responsiva e persistência em arquivo JSON estruturado) capaz de realizar o ciclo completo de CRUD de hábitos, registro de *check-ins* diários e cálculo automatizado de sequências (*streaks*).
2. **Mensurável (Measurable):** Entregar 100% dos 8 Requisitos Funcionais (RF01 a RF08) e 6 Requisitos Não Funcionais (RNF01 a RNF06), cobrindo o fluxo de trabalho através de no mínimo 15 Issues rastreadas, 2 releases estáveis (`v0.1.0` e `v0.2.0`/`v1.0.0`) e cobertura de testes automatizados para as regras de negócio centrais.
3. **Atingível (Achievable):** Utilização de stack tecnológica consolidada e leve (Node.js, Express, HTML5/CSS3/JS Vanilla e armazenamento local estruturado), eliminando sobrecarga de infraestrutura externa complexa.
4. **Relevante (Relevant):** Exercitar na prática a engenharia de software ponta a ponta (SDLC), garantindo rastreabilidade total entre especificação formal, histórias de usuário, backlog de issues, Git Flow, Commits Atômicos e Versionamento Semântico.
5. **Temporal (Time-bound):** Concluir toda a documentação de engenharia, estruturação do backlog de 15 issues e implementação funcional do MVP dentro do ciclo de 1 semana da atividade acadêmica.

---

## 3. Escopo do Projeto

### 3.1 Dentro do Escopo (In-Scope — Semana Atual)
- Documentação completa de engenharia (`project-charter.md`, `requisitos.md`, `casos-de-uso.md`, `user-stories.md`, `arquitetura-e-diagramas.md`).
- API RESTful para criação, listagem, filtragem por categoria, edição e exclusão de hábitos.
- Sistema de marcação/desmarcação (*toggle check-in*) de conclusão de hábito por data.
- Motor de cálculo automático de ofensiva atual (*current streak*), maior ofensiva (*longest streak*) e resumo geral de progresso.
- Interface web interativa (Dashboard) consumindo a API para uso imediato pelo usuário final.
- Suite de testes automatizados validando a API e as regras de negócio.
- Gestão de configuração com Git Flow (`main`, `develop`, `feature/*`), Conventional Commits e tags SemVer.

### 3.2 Fora do Escopo (Out-of-Scope — Próximas Fases)
- Autenticação multiusuário com OAuth2/JWT e recuperação de senha por e-mail.
- Aplicativo mobile nativo (iOS / Android).
- Notificações push ou envio de lembretes via WhatsApp/SMS.
- Integração com dispositivos vestíveis (*wearables* como Apple Watch ou Garmin).
- Gamificação social (rankings entre amigos, fóruns ou compartilhamento em redes sociais).

---

## 4. Stakeholders e Público-Alvo

### 4.1 Stakeholders
| Stakeholder | Papel | Interesse / Expectativa |
| :--- | :--- | :--- |
| **Professor / Avaliador** | Sponsor Acadêmico e Revisor Técnico | Avaliar a qualidade da especificação de requisitos, rastreabilidade das Issues, aplicação correta do Git Flow, Commits Atômicos e SemVer. |
| **Desenvolvedor (Autor)** | Engenheiro de Software / Product Owner | Projetar, documentar, implementar, testar e versionar o software seguindo padrões profissionais de mercado. |
| **Usuários Finais** | Consumidores do Produto | Utilizar uma interface rápida, intuitiva e confiável para acompanhar seus hábitos diários sem fricção. |

### 4.2 Público-Alvo
- **Estudantes universitários e de tecnologia** que desejam manter constância nos estudos diários de programação, leitura técnica e entregas acadêmicas.
- **Profissionais e entusiastas de produtividade** que buscam uma ferramenta minimalista e livre de distrações para monitorar rotinas de saúde, leitura e foco.
