# UBGE Bunker Calculator

Projeto: ferramenta de construção e simulação de cerco de bunkers do jogo
Foxhole, para o regimento UBGE (facção Colonial).

## Contexto importante

- Jogo: Foxhole (foxhole.wiki.gg é a fonte oficial de mecânicas)
- Nunca inventar números de jogo sem fonte. Se um valor não está confirmado,
  marcar como `// TODO: confirmar na wiki` no código, não assumir.
- A antiga divergência de integridade estrutural foi RESOLVIDA extraindo o
  código-fonte aberto do foxbunker.com (fonte de verdade do usuário) — ver
  src/data/foxbunkerReference.ts. Descobertas principais:
  - Os `confirmedEdgeModifier` em src/data/pieces.ts (0.941, 0.740, 0.672) são o
    QUADRADO do modificador real por peça (0.97², 0.86², 0.82²) — eram resultado de
    pair-test de duas peças iguais, gravado como se fosse de uma só. O modificador
    real single-piece é o `edgeModifier` do foxbunkerReference (= o antigo
    isolatedModifierHint para Blank/Rifle).
  - O Compact Bonus do foxbunker é ADITIVO e limitado (integ_produto + bônus,
    com cap), não multiplicativo como em structuralIntegrity.ts. Peça única = 100%.
  - foxbunker NÃO tem resistência a explosivo, wet/dry, manutenção nem dano de armas
    — esses seguem bloqueados (precisam de teste in-game).
  A aba "Importar" agora traz os números já-calculados do foxbunker (botão Copy →
  colar texto), então o caminho nativo do Construtor pode ser corrigido depois sem
  bloquear o uso. A correção do engine do Construtor está pendente de decisão.
- Paleta visual: bg-dark #1C1810, gold #C9A227, olive #7C8B5A, rust #A64B2A,
  cream #ddd8c0

## Não fazer

- Não usar localStorage/sessionStorage sem confirmar que o ambiente de deploy
  suporta (vai rodar fora do claude.ai, então isso é permitido aqui, diferente
  de artifacts do claude.ai)
- Não adicionar dependências de backend na v1 — tudo client-side
- Não embutir/hardcodar uma chave de API da Anthropic no bundle. O
  ImportFromImage.tsx chama a API da Anthropic (`@anthropic-ai/sdk`,
  `dangerouslyAllowBrowser: true`) direto do navegador usando uma chave que o
  PRÓPRIO usuário cola na UI e que fica só no localStorage dele — é o padrão
  "bring your own key", não uma chave nossa exposta. Não trocar isso por uma
  chave fixa no código nem por um serviço de terceiros sem discutir antes.
