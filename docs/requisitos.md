# Especificação de Requisitos do Sistema (RF e RNF)

Este documento detalha os **Requisitos Funcionais (RF)** e os **Requisitos Não Funcionais (RNF)** do sistema **HabitFlow**, mantendo rastreabilidade direta com as Histórias de Usuário (`docs/user-stories.md`), Casos de Uso (`docs/casos-de-uso.md`) e o Backlog de Issues do GitHub.

---

## 1. Requisitos Funcionais (RF)

Os Requisitos Funcionais descrevem os comportamentos, funcionalidades e regras de negócio que o software deve executar.

| Código | Título | Descrição Detalhada | Prioridade | Issue / US Relacionada |
| :--- | :--- | :--- | :---: | :---: |
| **[RF01]** | Cadastrar Hábito | O sistema deve permitir o cadastro de um novo hábito informando título obrigatório (mínimo de 3 caracteres), descrição opcional, categoria (`Saúde`, `Estudos`, `Produtividade`, `Mindfulness`, `Finanças`, `Outros`) e meta de frequência semanal (1 a 7 dias). | Alta | US01 / Issue #7 |
| **[RF02]** | Listar e Filtrar Hábitos | O sistema deve listar todos os hábitos cadastrados, permitindo filtrar os resultados por categoria ou status (ativos/concluídos no dia) e buscar por termo no título. | Alta | US02 / Issue #8 |
| **[RF03]** | Editar Hábito | O sistema deve permitir atualizar os dados cadastrais de um hábito existente (título, descrição, categoria e meta semanal) preservando seu histórico de *check-ins*. | Média | US03 / Issue #9 |
| **[RF04]** | Excluir Hábito | O sistema deve permitir remover permanentemente um hábito e todo o seu histórico de registros mediante confirmação do usuário. | Média | US03 / Issue #9 |
| **[RF05]** | Registrar Check-in Diário | O sistema deve permitir marcar ou desmarcar (*toggle*) a conclusão de um hábito em uma data específica (padrão: data atual `YYYY-MM-DD`), impedindo registros duplicados na mesma data. | Alta | US04 / Issue #10 |
| **[RF06]** | Calcular Ofensiva (Streaks) | O sistema deve calcular automaticamente para cada hábito a sequência atual de dias consecutivos cumpridos (*current streak*) e o recorde histórico de dias consecutivos (*best streak*). | Alta | US05 / Issue #11 |
| **[RF07]** | Exibir Dashboard de Estatísticas | O sistema deve disponibilizar um resumo consolidado contendo: total de hábitos ativos, total de hábitos concluídos hoje, taxa percentual de conclusão diária e maior ofensiva ativa do usuário. | Média | US05 / Issue #11 |
| **[RF08]** | Validar Dados de Entrada | O sistema deve validar todas as requisições recebidas na API e no formulário web, retornando mensagens de erro claras (HTTP 400 / feedback visual) quando campos obrigatórios estiverem ausentes ou fora do formato esperado. | Alta | US01 / Issue #7 |
| **[RF09]** | Autenticar Usuário | O sistema deve permitir criar conta (nome, e-mail único e senha de no mínimo 8 caracteres) e entrar com e-mail e senha, e cada usuário deve ver e alterar somente os próprios hábitos. | Alta | Issue #63 |

---

## 2. Requisitos Não Funcionais (RNF)

Os Requisitos Não Funcionais definem os atributos de qualidade, restrições técnicas, desempenho e padrões arquiteturais do sistema.

| Código | Categoria | Descrição Detalhada | Critério de Verificação |
| :--- | :--- | :--- | :--- |
| **[RNF01]** | Desempenho | As rotas da API REST devem responder às requisições locais em tempo inferior a **100ms** para cargas de até 1.000 hábitos registrados. | Testes de integração e inspeção de tempo de resposta HTTP. |
| **[RNF02]** | Persistência | Os dados de hábitos e histórico de *check-ins* devem ser persistidos em disco num banco SQLite, garantindo que nenhuma informação seja perdida ao reiniciar o servidor nem quando dois processos gravam ao mesmo tempo. | Reinicialização do serviço mantendo os dados salvos em `data/habitflow.db`; check-ins simultâneos de processos diferentes todos persistidos. |
| **[RNF03]** | Usabilidade e Responsividade | A interface web deve ser responsiva (adaptando-se a telas desktop a partir de 1024px e dispositivos móveis a partir de 360px) e permitir registrar um *check-in* diário com apenas **1 clique**. | Inspeção visual em diferentes resoluções e fluxo de clique único no card do hábito. |
| **[RNF04]** | Manutenibilidade e Padrão de Código | O código-fonte deve ser modularizado em camadas (Rotas/Controllers, Serviços/Regras de Negócio e Persistência), utilizando nomenclatura clara e sem dependências desnecessárias. | Revisão da árvore de diretórios em `src/` e separação entre `habitService` e `server`. |
| **[RNF05]** | Confiabilidade e Tratamento de Erros | A API deve utilizar códigos de status HTTP semânticos (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`) e nunca expor *stack traces* brutos ao usuário final. | Execução da suíte de testes automatizados verificando cenários de erro. |
| **[RNF06]** | Portabilidade | O sistema deve ser executável em qualquer sistema operacional (Windows, Linux ou macOS) que possua Node.js (v22.13+) instalado, sem exigir instalação de SGBDs externos pesados (o SQLite é embutido no Node). | Execução limpa via `npm install && npm start` em qualquer ambiente Node.js. |

---

## 3. Matriz de Rastreabilidade

| Requisito | Caso de Uso (`casos-de-uso.md`) | User Story (`user-stories.md`) | Módulo de Código (`src/`) | Issue no GitHub |
| :---: | :---: | :---: | :--- | :---: |
| **RF01 / RF08** | UC01 - Cadastrar Hábito | US01 | `src/services/habitService.js` | #7 |
| **RF02** | UC02 - Consultar e Filtrar Hábitos | US02 | `src/services/habitService.js` | #8 |
| **RF03 / RF04** | UC03 - Manter Hábito (Editar/Excluir) | US03 | `src/services/habitService.js` | #9 |
| **RF05** | UC04 - Registrar Check-in Diário | US04 | `src/services/habitService.js` | #10 |
| **RF06 / RF07** | UC05 - Visualizar Estatísticas e Streaks | US05 | `src/utils/streakCalculator.js` | #11 |
| **RF09** | — | — | `src/auth/`, `src/storage/sqliteStorage.js` | #63 |
