// Selection Stats — seção "Building Maintenance".
//
// Regra de ouro: nenhum número entra sem confirmação empírica (in-game ou par-testado).
// O custo de manutenção (Garrison Supplies / MSupps por hora) por peça de bunker ainda
// não foi confirmado, então o campo fica bloqueado — a UI mostra "não confirmado" em vez
// de estimar.
//
// TODO: confirmar empiricamente MSupps/hora por peça (varia por tier? por tipo de peça?)
export const MSUPPS_PER_HOUR_PER_PIECE: number | null = null
