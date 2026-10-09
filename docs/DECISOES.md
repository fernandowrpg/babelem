# Decisões de implementação e pendências de regra

As fontes usadas foram o documento "Babelém – Sumário Hipotético e Esqueleto de Livro" e a planilha "Babelém: Fronteiras Ocultas – REDUX 2", nas abas FICHA, REGRAS, ESSÊNCIAS, TRAÇOS, TÉCNICAS, FEITIÇARIA, ESTILO DE COMBATE, AMEAÇAS e TABELA DE CONTEÚDOS.

Quando as fontes divergiam ou deixavam lacunas, a escolha está registrada abaixo. Itens marcados com ⚙️ são **configuráveis** nas opções do mundo.

## Divergências entre as fontes

| # | Tema | Divergência | Decisão |
|---|---|---|---|
| 1 | 1s nas rolagens ⚙️ | O documento diz que cada 1 dá Trama à Tecelã. A aba REGRAS diz que dá Trama **e** Aura ao jogador. | Segue a aba REGRAS (mais recente). Desligue em *1s concedem Aura*. |
| 2 | Passado/Inventário ⚙️ | A ficha oficial dá +1d. A ficha de exemplo ("fernando") dá +2d. | Padrão +1d; ajustável em *Dados de Passado/Inventário*. |
| 3 | d66 das Essências | A aba ESSÊNCIAS e a TABELA DE CONTEÚDOS usam ordens diferentes. | Segue a aba ESSÊNCIAS. |
| 4 | Nomes de técnicas | A TABELA DE CONTEÚDOS cita "Golpe Desequilibrante", "Combo Extenuante" e "Convocar Espírito". | Seguem as abas detalhadas: Atropelo, Destruição Imediata e Espírito Guardião. |
| 5 | Traços extras | A TABELA DE CONTEÚDOS lista **Chef** e **Sombra**, que não estão na aba TRAÇOS. Chef só existe numa aba de rascunho (que usa o atributo antigo VONTADE). | Não incluídos. |
| 6 | "Disputa de Mente" | Algumas ameaças usam o termo antigo "Mente". | Trocado por **disputa de SAFO**. |
| 7 | Acertos das Ameaças | Uma regra diz "GRAU + PERIGO atual"; outra, "considere PERIGO como número de acertos". | A ficha mostra GRAU + PERIGO. |
| 8 | Estatísticas de Ameaças | Várias ameaças de Grau 1 têm PERIGO 1 e DEFESA 3, o oposto da tabela de improviso (3/1). | Mantidos os valores da planilha. O botão *Aplicar tabela de Grau* usa a tabela. |
| 9 | "Dado da Trama" | A regra de Ferimentos manda jogar o "Dado da Trama", que não é definido em nenhum lugar. | Interpretado como **1d8 (Dado do Eco)**: derrotado se o resultado for ≤ nº de ferimentos marcados. |

## Lacunas preenchidas por interpretação

- **Esforço** gasta 1 da reserva do **atributo testado**.
- **Descanso** restaura reservas, Guarda e Memória, remove os ferimentos Temporário e Grave e zera o Sangue (Feitiçaria de Sangue). O ferimento Mortal continua até ser tratado.
- **Fim de Cena** cumpre a regra (+1 em cada reserva, remove o ferimento Temporário, Guarda no máximo, +1 Trama) e, conforme "Dano à Memória", recupera **metade da Memória máxima**.
- **Início de Sessão**: a Trama passa a ser o número de jogadores conectados.
- **Iniciativa**: Protagonistas agem antes das Ameaças (o turno é dos protagonistas, que alternam ações entre si).
- **Criar Vantagem** consome 1 da reserva escolhida (LIGEIRO para notar, SAFO para recordar) e adiciona 1 dado à Pilha Comum.
- **Rito Sonoro** reduz em 1 o custo de Aura (mínimo 1). **Rito Motor** soma +1 de dano por Acerto no teste da habilidade. Cada rito gera 1 Trama.
- **Ameaças pagando custos em Aura** pagam com Trama, como indicam as fichas de ameaça ("A Tecelã paga TRAMA no lugar de Aura").
- **Sombra**: Guarda e Perigo são "iguais aos do Anteparo". O compêndio usa 12/3/1, com uma nota no campo Especial.

## Conteúdo não incluído (pendente)

- Ameaças com nome provisório ("ASDASD…") e as ideias da aba DUMP DE IDEIAS (Parasita do Sono, A Loira, Sumaúma, Arautos), que ainda não têm estatísticas.
- Texto de cenário do documento (Introdução, Cenário, Facções, Magia e Memória…). Pode virar um diário "Cenário" em `src/packs/` quando o texto estiver fechado.
- Seções ainda vazias no documento: Segurança em Jogo, Geografia, Pontos de Interesse, NPCs, Máquina de Mistérios.
- RollTables d66. Por enquanto, as tabelas ficam no diário "Tabelas e Listas (d66)", com links para os itens.

## Compatibilidade

- Desenvolvido sobre as APIs do Foundry v13: ApplicationV2, `TypeDataModel` e os namespaces `foundry.applications.*`. Não usa APIs marcadas para remoção.
- `system.json` declara `minimum: 13` e `verified: 13`. Depois de testar no v14, troque `verified` para `14`.
