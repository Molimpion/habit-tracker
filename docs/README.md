# Documentação de engenharia do HabitFlow

## Índice

| Documento | Conteúdo | Reflete a versão | Última atualização |
| :--- | :--- | :---: | :---: |
| [`project-charter.md`](./project-charter.md) | Termo de abertura: justificativa, objetivos SMART, escopo e stakeholders | `v1.0.0` | 2026-11-06 |
| [`requisitos.md`](./requisitos.md) | RF01 a RF11, RNF01 a RNF06 e matriz de rastreabilidade até código, teste e issue | `v2.0.0` | 2026-11-07 |
| [`casos-de-uso.md`](./casos-de-uso.md) | Atores, diagrama e fluxos dos casos de uso UC01 a UC05 | `v2.0.0` | 2026-11-07 |
| [`user-stories.md`](./user-stories.md) | Histórias US01 a US05 com critérios de aceite em BDD | `v1.0.0` | 2026-11-06 |
| [`arquitetura-e-diagramas.md`](./arquitetura-e-diagramas.md) | Componentes, classes, estados das ofensivas, endpoints e formato de erro da API | `v2.0.0` | 2026-11-07 |

O termo de abertura e as histórias de usuário registram o planejamento do MVP e não foram reescritos depois dele. Autenticação (RF09), exportação em CSV (RF10) e lembrete por e-mail (RF11) estão documentados nos requisitos e na arquitetura.

## Regra de sincronização documentação e código

1. Todo PR que cria, muda ou remove comportamento visível (rota da API, regra de validação, tela, variável de ambiente) atualiza no mesmo PR os documentos afetados:
   - requisito novo ou alterado em `requisitos.md`, com a linha correspondente na matriz de rastreabilidade;
   - rota, formato de resposta ou componente novo em `arquitetura-e-diagramas.md`;
   - instrução de uso ou variável nova no `README.md` da raiz.
2. Ao atualizar um documento, o PR também atualiza a versão e a data dele neste índice.
3. Na revisão, o checklist do template de PR inclui "documentação atualizada quando o comportamento mudou". PR que muda RF sem tocar em `docs/` volta para ajuste.
