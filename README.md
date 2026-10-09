# Babelém — Foundry VTT

Sistema para jogar **Babelém**, RPG de fantasia urbana, no [Foundry Virtual Tabletop](https://foundryvtt.com) **v13 e v14**, em **português** e **inglês**.

> *English summary below.*

## O que vem no sistema

- **Ficha de Protagonista** no mesmo layout da ficha oficial: Essência e eventos de Aura, Aparência, Passado e Inventário, Atributos/Reservas (BRABO, LIGEIRO, SAFO), Aura, Integridade (Guarda e Memória calculadas), Ferimentos, Traços, Estilo de Combate, Técnicas e Feitiços.
- **Ficha de Ameaça** com Grau, arquétipo (normal, chefe, lacaio), Guarda/Perigo/Defesa, interações roláveis, Poder e Fraqueza, e a tabela de improviso por Grau.
- **Arrastar e soltar** qualquer Essência, Traço, Técnica, Feitiço ou Propriedade de Estilo do compêndio direto na ficha. A Essência nova substitui a antiga, e itens repetidos são recusados.
- **Testes de dados**: Nd6, Acertos em 5–6, limite de 1 a 9 dados. No cartão do chat dá para queimar Aura (1 → Acerto), aplicar Esforço e confirmar a rolagem (os 1s restantes viram Trama e Aura). Ataques Brabo, Ligeiro e Safo calculam o dano. Esquivar e Bloquear também estão na ficha.
- **Painel da Trama**: pontos de Trama, Pilha Comum (+Δd), Dado do Eco (1d8), Fim de Cena e Início de Sessão.
- **Dano**: tipos cinético, vazio e energético; AD, Barreira, resistência e vulnerabilidade (inclusive vinda de Traços). Ferimentos são marcados automaticamente. A Ameaça que chega a 0 de Guarda gasta Defesa e fica exposta.
- **Habilidades**: pagam o custo, aceitam Liberação Extra, Rito Motor e Rito Sonoro (que geram Trama) e rolam o teste quando configurado. Pactos de Restrição ficam registrados no item.
- **Estados** como efeitos de token (Impedido, Atordoado, Desequilibrado, Canalizando, Guarda Levantada…).
- **Compêndios em PT e EN**: 18 Essências, 18 Traços, 36 Técnicas, 36 Feitiços, 6 Propriedades de Estilo, 17 Ameaças e o diário de Regras com as tabelas d66.

## Instalação

No Foundry: **Game Systems → Install System** e cole a URL do manifesto:

```
https://github.com/fernandowrpg/babelem/releases/latest/download/system.json
```

(O workflow de release mantém `manifest` e `download` atualizados a cada versão.)

## Desenvolvimento

Requisitos: Node 20+.

```bash
npm install
npm run build        # valida os dados e compila os compêndios em packs/
```

Para testar localmente, crie um link da pasta do repositório em `Data/systems/babelem` do Foundry (no Windows, rode `mklink /J` como administrador):

```bash
mklink /J "%LOCALAPPDATA%\FoundryVTT\Data\systems\babelem" "C:\caminho\para\babelem"
```

Rode `npm run build:packs` sempre que alterar `src/packs/*.yml` e reinicie o mundo.

### Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/packs/*.yml` | **Fonte dos compêndios** (regras, textos e números) em PT e EN, lado a lado |
| `module/` | Código do sistema (modelos de dados, documentos, fichas, rolagens) |
| `templates/` | Templates Handlebars das fichas, cartões de chat e diálogos |
| `lang/` | Traduções da interface (`pt-BR.json`, `en.json`) |
| `styles/` | CSS |
| `tools/` | Build, validação e empacotamento |
| `docs/` | Decisões de regra e pendências |

Os compêndios (`packs/`) **não são versionados**: são gerados a partir do YAML no build e no release.

### Publicando uma versão

1. Atualize `CHANGELOG.md` e a `version` em `system.json` e `package.json`.
2. Crie um release no GitHub com a tag `vX.Y.Z`.
3. O workflow `release.yml` valida, compila os compêndios, preenche `url`, `manifest` e `download` e anexa `system.json` e `babelem.zip` ao release.

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para editar regras e textos.

---

## English

Foundry VTT (v13/v14) system for **Babelém**, an urban fantasy RPG, with Portuguese and English UI and compendiums. It includes Protagonist and Threat sheets, drag-and-drop compendium content (Essences, Traits, Techniques, Spells, Combat Style properties, Threats, Rules journal), d6 Hit-based tests with Aura burning, Effort, Weave points, the Common Pool and the Echo Die, plus damage, wound and condition automation.

Build with `npm install && npm run build`. Compendium sources live in `src/packs/*.yml`, with Portuguese and English text side by side.
