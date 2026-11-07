# Histórias de Usuário (User Stories) e Critérios de Aceite

As Histórias de Usuário abaixo foram elaboradas seguindo o formato canônico ágil (**"Como [ator], quero [ação] para que [valor de negócio]"**) e acompanhadas de **Critérios de Aceite explícitos no padrão BDD / Gherkin** (*Dado / Quando / Então*).

---

## US01 — Cadastro de Novos Hábitos
> **Como** usuário em busca de uma rotina consistente,  
> **Quero** cadastrar novos hábitos informando título, categoria e meta semanal,  
> **Para que** eu possa organizar e acompanhar minhas atividades diárias em um único lugar.

**Requisitos Vinculados:** `[RF01]`, `[RF08]`  
**Issue Vinculada:** `Issue #7`

### Critérios de Aceite (BDD / Gherkin)

```gherkin
Funcionalidade: Cadastro de Hábitos

  Cenário 1: Cadastro de hábito com dados válidos
    Dado que estou na página principal do HabitFlow ou consumindo a API POST "/api/habits"
    Quando informo o título "Estudar Engenharia de Software", a categoria "Estudos" e a meta semanal de 5 dias
    Então o sistema deve salvar o novo hábito com status HTTP 201
    E o hábito deve aparecer na listagem com ofensiva inicial igual a 0 dias.

  Cenário 2: Tentativa de cadastro sem título ou com título muito curto
    Dado que desejo cadastrar um novo hábito
    Quando envio o formulário com o título vazio ou contendo menos de 3 caracteres (ex: "Ir")
    Então o sistema deve recusar o cadastro com status HTTP 400
    E deve exibir a mensagem de erro "O título do hábito é obrigatório e deve ter pelo menos 3 caracteres".
```

---

## US02 — Listagem e Filtragem de Hábitos por Categoria
> **Como** usuário com múltiplos hábitos cadastrados,  
> **Quero** visualizar todos os meus hábitos e filtrá-los por categoria ou termo de busca,  
> **Para que** eu encontre rapidamente as atividades referentes ao meu momento do dia (ex.: Estudos ou Saúde).

**Requisitos Vinculados:** `[RF02]`  
**Issue Vinculada:** `Issue #8`

### Critérios de Aceite (BDD / Gherkin)

```gherkin
Funcionalidade: Listagem e Filtragem de Hábitos

  Cenário 1: Listar todos os hábitos ativos
    Dado que possuo 3 hábitos cadastrados no sistema
    Quando acesso a listagem principal sem filtros aplicados
    Então o sistema deve exibir os 3 hábitos com seus respectivos títulos, categorias, metas e streaks.

  Cenário 2: Filtrar hábitos por categoria específica
    Dado que possuo hábitos nas categorias "Saúde" e "Estudos"
    Quando seleciono o filtro de categoria "Saúde"
    Então o sistema deve exibir apenas os hábitos pertencentes à categoria "Saúde"
    E deve ocultar os hábitos das demais categorias.
```

---

## US03 — Edição e Exclusão de Hábitos
> **Como** usuário do sistema,  
> **Quero** editar as informações de um hábito ou excluí-lo quando não fizer mais sentido na minha rotina,  
> **Para que** minha lista de hábitos permaneça sempre atualizada e relevante.

**Requisitos Vinculados:** `[RF03]`, `[RF04]`  
**Issue Vinculada:** `Issue #9`

### Critérios de Aceite (BDD / Gherkin)

```gherkin
Funcionalidade: Manutenção de Hábitos (Edição e Exclusão)

  Cenário 1: Atualizar título e meta semanal preservando histórico
    Dado que possuo o hábito "Ler 10 páginas" com 4 dias de check-ins registrados
    Quando altero o título para "Ler 20 páginas de livro técnico" e a meta semanal para 7 dias
    Então o sistema deve atualizar os dados cadastrais com status HTTP 200
    E os 4 dias de check-ins anteriores devem permanecer intactos no histórico do hábito.

  Cenário 2: Excluir um hábito existente
    Dado que possuo um hábito que não desejo mais acompanhar
    Quando aciono a opção de excluir para o ID desse hábito
    Então o sistema deve remover o registro da base de dados com status HTTP 200
    E o hábito não deve mais aparecer nas consultas futuras.
```

---

## US04 — Registro de Check-in Diário (Marcar/Desmarcar)
> **Como** usuário focado em cumprir minhas metas diárias,  
> **Quero** marcar ou desmarcar um hábito como concluído no dia de hoje com apenas um clique,  
> **Para que** meu progresso diário seja registrado de forma rápida e sem burocracia.

**Requisitos Vinculados:** `[RF05]`  
**Issue Vinculada:** `Issue #10`

### Critérios de Aceite (BDD / Gherkin)

```gherkin
Funcionalidade: Check-in Diário de Hábito

  Cenário 1: Marcar hábito como concluído na data atual
    Dado que o hábito "Beber 2L de água" ainda não foi concluído hoje
    Quando aciono o check-in para a data atual
    Então a data de hoje (YYYY-MM-DD) deve ser adicionada à lista de conclusões do hábito
    E o indicador "Concluído Hoje" deve passar para verdadeiro (true).

  Cenário 2: Desmarcar hábito clicado por engano (Toggle)
    Dado que o hábito "Beber 2L de água" já está marcado como concluído na data de hoje
    Quando aciono novamente o check-in para a mesma data
    Então a data de hoje deve ser removida da lista de conclusões do hábito
    E o indicador "Concluído Hoje" deve voltar para falso (false) sem gerar duplicidade.
```

---

## US05 — Acompanhamento de Ofensivas (Streaks) e Estatísticas
> **Como** usuário buscando motivação contínua,  
> **Quero** visualizar minha sequência atual de dias consecutivos (*streak*), meu recorde histórico e a porcentagem de conclusão do dia,  
> **Para que** eu me sinta engajado a não quebrar minha sequência de hábitos cumpridos.

**Requisitos Vinculados:** `[RF06]`, `[RF07]`  
**Issue Vinculada:** `Issue #11`

### Critérios de Aceite (BDD / Gherkin)

```gherkin
Funcionalidade: Cálculo de Streaks e Dashboard de Progresso

  Cenário 1: Cálculo de sequência ativa (Current Streak)
    Dado que um hábito possui check-ins registrados anteontem, ontem e hoje
    Quando consulto os detalhes do hábito ou o dashboard
    Então a ofensiva atual (currentStreak) deve ser igual a 3 dias.

  Cenário 2: Quebra de sequência por ausência de check-in
    Dado que um hábito possui check-ins há 5, 4 e 3 dias atrás, mas não foi concluído nem ontem nem hoje
    Quando o sistema calcula as estatísticas do hábito
    Então a ofensiva atual (currentStreak) deve ser igual a 0
    E o recorde histórico (bestStreak) deve preservar o valor de 3 dias.

  Cenário 3: Resumo percentual no Dashboard
    Dado que possuo 4 hábitos cadastrados e concluí 2 deles na data de hoje
    Quando visualizo o resumo de estatísticas do dia
    Então o sistema deve apresentar "2 de 4 concluídos hoje" e taxa de conclusão igual a 50%.
```
