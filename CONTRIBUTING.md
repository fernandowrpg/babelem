# Como evoluir regras e textos

O Babelém está em desenvolvimento. O repositório foi organizado para que **mudar uma regra ou um texto seja editar um arquivo YAML**, sem mexer em código.

## Onde fica cada coisa

| Arquivo | Compêndio |
|---|---|
| `src/packs/essences.yml` | Essências |
| `src/packs/traits.yml` | Traços |
| `src/packs/techniques.yml` | Técnicas |
| `src/packs/spells.yml` | Feitiços (Oblivo e Litura) |
| `src/packs/styles.yml` | Propriedades de Estilo de Combate |
| `src/packs/threats.yml` | Ameaças (com interações) |
| `src/packs/rules.yml` | Diário de Regras (as tabelas d66 são geradas automaticamente) |
| `lang/pt-BR.json`, `lang/en.json` | Textos da interface (botões, rótulos, dicas) |

Todo texto de conteúdo tem as duas línguas lado a lado:

```yaml
  - key: velocidade          # identificador estável: NÃO mude depois de publicado
    itemType: technique
    d66: "3/1"
    techType: atq            # atq | sup | reac
    cost: { value: 1, resource: aura }   # aura | brabo | ligeiro | safo | special | none
    test: { attack: ligeiro }             # opcional: faz o uso da habilidade rolar o teste
    name:
      pt: Velocidade
      en: Speed
    description:
      pt: Caso tenha feito um ataque ligeiro, ...
      en: If you made a SWIFT attack, ...
```

### Regras para editar

- **`key` é permanente.** Ela gera o ID do documento no compêndio. Se mudar, mundos que já importaram o item perdem o vínculo. Para "renomear", mude só `name`.
- Para **adicionar** uma entrada, copie uma existente e crie uma `key` nova (minúsculas, com hífens).
- Para **remover** uma entrada, apague o bloco.
- Texto simples vira parágrafo automaticamente. Linhas em branco separam parágrafos. Para listas e negrito, comece o texto com HTML (`<p>`, `<ul>`, `<strong>`).
- Se ainda não houver tradução, **deixe o `en` igual ao `pt`** e abra uma issue: o validador recusa texto vazio.

### Glossário PT → EN

BRABO → FIERCE · LIGEIRO → SWIFT · SAFO → SAVVY · Guarda → Guard · Memória → Memory · Trama → Weave · Tecelã → the Weaver · Acerto → Hit · Pilha Comum → Common Pool · Dado do Eco → Echo Die · dano AD → PD damage (pierces defense) · PERIGO → DANGER · DEFESA → DEFENSE · Grau → Grade (ameaça) / Degree (tarefa) · Liberação Extra → Extra Release · Desperto → Awakened · Eco → Echo.

## Fluxo de trabalho

```bash
npm install
npm run validate     # confere YAML, traduções completas, chaves de i18n e templates
npm run build:packs  # gera packs/ para testar no Foundry
```

1. Crie uma branch (`regra-ajuste-velocidade`, `texto-ameacas-litura`…).
2. Edite o YAML e rode `npm run validate`.
3. Teste no Foundry (veja o README).
4. Abra um Pull Request descrevendo **o que mudou nas regras**. O CI valida e compila os compêndios.
5. Registre a mudança em `CHANGELOG.md`, na seção "Não lançado".

## Versionamento

[SemVer](https://semver.org/lang/pt-BR/):

- **patch** (0.1.**1**): correção de texto ou bug.
- **minor** (0.**2**.0): conteúdo ou regra nova, ou ajuste de equilíbrio.
- **major** (**1**.0.0): mudança que quebra fichas existentes (ex.: renomear um campo do modelo de dados).

Mudança no modelo de dados (`module/data/*.mjs`) pede migração. Documente em `docs/DECISOES.md`.
