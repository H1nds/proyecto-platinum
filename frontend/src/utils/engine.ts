import { Battle } from '@pkmn/sim';

export const formatTeamForEngine = (team: any[]) => {
  return team.filter(p => p && p.name).map(poke => {
    let validMoves = poke.moves?.filter((m: string) => m && m.trim() !== '') || [];
    if (validMoves.length === 0) validMoves = ['Tackle']; // Seguro Anti-Squirtle

    return {
      name: poke.name,
      species: poke.name,
      item: poke.item || '',
      ability: poke.ability || 'Illuminate',
      moves: validMoves,
      nature: poke.nature || 'Serious',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...(poke.evs || {}) },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...(poke.ivs || {}) },
      level: poke.level || 50,
      teraType: poke.teraType || 'Normal',
    };
  });
};

export const startShowdownEngine = (format: string, p1Name: string, p1Team: any[], p2Name: string, p2Team: any[]) => {
  
  // EL TRUCO DEFINITIVO: Añadimos '@@@!teampreview' para desactivar la fase de elección.
  // El motor lanzará al primer Pokémon automáticamente.
  const battle = new Battle({
    formatid: 'gen9customgame@@@!teampreview', 
    seed: [1, 2, 3, 4], 
  } as any);

  try {
    const team1 = formatTeamForEngine(p1Team);
    const team2 = formatTeamForEngine(p2Team);

    // @ts-ignore
    battle.setPlayer('p1', { name: p1Name, team: team1 });
    // @ts-ignore
    battle.setPlayer('p2', { name: p2Name, team: team2 });
  } catch (error) {
    console.error("Error crítico al inyectar los equipos:", error);
  }
  
  return battle;
};