// src/utils/showdown.ts

export const jsonToShowdownText = (team: any[]) => {
  return team.map(poke => {
    if (!poke || !poke.name) return '';
    
    let str = `${poke.name}`;
    if (poke.item) str += ` @ ${poke.item}`;
    str += `\nAbility: ${poke.ability || 'Illuminate'}`; // Habilidad por defecto si no tiene
    if (poke.level) str += `\nLevel: ${poke.level}`;
    if (poke.teraType) str += `\nTera Type: ${poke.teraType}`;
    
    // Stats
    str += `\nEVs: ${poke.evs?.hp || 0} HP / ${poke.evs?.atk || 0} Atk / ${poke.evs?.def || 0} Def / ${poke.evs?.spa || 0} SpA / ${poke.evs?.spd || 0} SpD / ${poke.evs?.spe || 0} Spe`;
    str += `\n${poke.nature || 'Serious'} Nature`;
    str += `\nIVs: ${poke.ivs?.hp || 31} HP / ${poke.ivs?.atk || 31} Atk / ${poke.ivs?.def || 31} Def / ${poke.ivs?.spa || 31} SpA / ${poke.ivs?.spd || 31} SpD / ${poke.ivs?.spe || 31} Spe`;
    
    // Movimientos
    if (poke.moves && Array.isArray(poke.moves)) {
      poke.moves.forEach((move: string) => {
        if (move && move.trim() !== '') str += `\n- ${move}`;
      });
    }
    return str;
  }).filter(str => str !== '').join('\n\n');
};