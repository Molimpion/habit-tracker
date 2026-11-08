# Como contribuir com o HabitFlow

## Preparar o ambiente

1. Node.js 22.13 ou superior.
2. `npm install`, que instala o ESLint e ativa o hook de pre-commit em `.githooks/`.
3. `cp .env.example .env` e troque o `JWT_SECRET` por um valor gerado com `openssl rand -hex 32`.
4. `npm start` e abra `http://localhost:3000`.

## Fluxo de branches (Git Flow)

Nenhum commit vai direto para `main` ou `develop`. Toda mudança nasce de uma issue.

1. Abra a issue pelo template (bug, funcionalidade ou documentação), com critérios de aceite em BDD.
2. Crie a branch a partir de `develop`: `feature/issue-NN-descricao-curta`.
3. Abra o Pull Request para `develop` usando o template e com `Closes #NN` na descrição.
4. O merge acontece com o CI verde. A branch é apagada automaticamente depois do merge.

### Release

1. Crie `release/vX.Y.Z` a partir de `develop` e atualize `version` no `package.json` e o `CHANGELOG.md`.
2. Abra o PR de `release/vX.Y.Z` para `main`.
3. Depois do merge, crie a tag anotada `vX.Y.Z` em `main` e a Release no GitHub.
4. Abra o PR de `main` para `develop`, para a versão nova voltar à integração. A branch de release já foi apagada pelo merge automático, por isso o retorno sai de `main`.

Versões seguem o SemVer: `MAJOR` quando o contrato da API quebra, `MINOR` para funcionalidade nova compatível e `PATCH` para correção ou documentação.

## Commits

Conventional Commits, em português, com a issue no fim do título:

```
feat(auth): cadastro, login com JWT e isolamento dos hábitos por usuário (#63)
fix(api): responder 404 para hábito de outro usuário (#NN)
docs(readme): documentar a execução com Docker (#78)
test: gerar o segredo JWT dos testes na hora (#72)
ci: rodar o lint no pipeline (#76)
chore(deps): habilitar Dependabot (#73)
```

Um commit por mudança lógica. O hook de pre-commit roda `npm run lint` e `npm test` e bloqueia o commit se algum falhar. O conserto é o código, não `--no-verify`.

## Testes

- `npm test` roda a suíte. `npm run test:coverage` roda com cobertura e falha abaixo de 85% das linhas, que é o que o CI exige.
- Toda regra nova ganha um teste cujo nome descreve o comportamento ("responde 404 quando B tenta excluir o hábito de A"), não a implementação.
- Antes de abrir o PR, quebre a regra de propósito (apague o `if`, troque `>=` por `>`) e confira que algum teste fica vermelho. Se nenhum ficar, o teste está fraco.
- Teste que falha se conserta, não se pula.

## Documentação

PR que muda comportamento atualiza junto `docs/` (requisitos, casos de uso, arquitetura) e o README. A matriz de rastreabilidade em `docs/requisitos.md` liga cada requisito ao código, ao teste e à issue.

## Segurança

Segredos só no `.env` local, nunca em arquivo versionado. O CI roda gitleaks no histórico e `npm audit`; um achado barra o merge.
