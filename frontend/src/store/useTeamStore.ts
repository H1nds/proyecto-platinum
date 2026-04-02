import { create } from 'zustand';

// 1. Lo que compone a un Pokémon individual (Pronto añadiremos EVs, IVs, Moves, Item, Ability)
export interface TeamMember {
  slotId: string;
  pokemonId: number | null;
  name: string | null;
  sprite: string | null;
}

// 2. Lo que compone a un Equipo completo
export interface Team {
  id: string;
  name: string;
  format: 'VGC' | 'Singles' | 'Custom';
  members: TeamMember[];
}

// 3. El Estado Global (Aquí definimos qué variables y funciones tendremos)
interface TeamBuilderState {
  teams: Team[];
  activeTeamId: string | null; // El equipo que estamos editando actualmente
  
  // Acciones
  createNewTeam: (name: string, format?: 'VGC' | 'Singles' | 'Custom') => void;
  setActiveTeam: (teamId: string | null) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  updateTeamMember: (teamId: string, memberIndex: number, pokemonInfo: Partial<TeamMember>) => void;
  importTeam: (teamId: string, importedMembers: Partial<TeamMember>[]) => void;
  removeTeamMember: (teamId: string, memberIndex: number) => void;
  deleteTeam: (teamId: string) => void;
}

// Función de ayuda (Helper) para crear 6 slots vacíos al crear un equipo nuevo
const createEmptySlots = (): TeamMember[] => 
  Array.from({ length: 6 }).map(() => ({
    slotId: crypto.randomUUID(),
    pokemonId: null,
    name: null,
    sprite: null,
  }));

// 4. Implementación de nuestra tienda (Store)
export const useTeamStore = create<TeamBuilderState>((set) => ({
  teams: [],
  activeTeamId: null,

  // Crear un nuevo equipo
  createNewTeam: (name, format = 'VGC') => 
    set((state) => {
      const newTeam: Team = {
        id: crypto.randomUUID(),
        name,
        format,
        members: createEmptySlots(),
      };
      return { 
        teams: [...state.teams, newTeam],
        activeTeamId: newTeam.id // Al crearlo, lo marcamos como activo automáticamente
      };
    }),

  // Entrar o salir de un equipo (si pasas null, te sales a la lista)
  setActiveTeam: (teamId) => set({ activeTeamId: teamId }),

  // Cambiar el nombre o el formato del equipo entero
  updateTeam: (teamId, updates) =>
    set((state) => ({
      teams: state.teams.map((t) => 
        t.id === teamId ? { ...t, ...updates } : t
      ),
    })),

  // Ponerle un Pokémon a un Slot específico
  updateTeamMember: (teamId, memberIndex, pokemonInfo) =>
    set((state) => {
      const teamIndex = state.teams.findIndex(t => t.id === teamId);
      if (teamIndex === -1) return state;

      const newTeams = [...state.teams];
      const newMembers = [...newTeams[teamIndex].members];
      
      newMembers[memberIndex] = { ...newMembers[memberIndex], ...pokemonInfo };
      newTeams[teamIndex] = { ...newTeams[teamIndex], members: newMembers };

      return { teams: newTeams };
    }),

    // Importar un equipo completo desde Showdown
  importTeam: (teamId, importedMembers) =>
    set((state) => {
      const teamIndex = state.teams.findIndex(t => t.id === teamId);
      if (teamIndex === -1) return state;
      const newTeams = [...state.teams];
      const currentMembers = [...newTeams[teamIndex].members];
  
  // Sobrescribimos los slots con los datos importados
  for (let i = 0; i < 6; i++) {
    if (importedMembers[i]) {
      currentMembers[i] = { ...currentMembers[i], ...importedMembers[i] };
    }
  }

  newTeams[teamIndex] = { ...newTeams[teamIndex], members: currentMembers };
  return { teams: newTeams };
}),

  // Vaciar un Slot (Eliminar al Pokémon de ese espacio)
  removeTeamMember: (teamId, memberIndex) =>
    set((state) => {
      const teamIndex = state.teams.findIndex(t => t.id === teamId);
      if (teamIndex === -1) return state;

      const newTeams = [...state.teams];
      const newMembers = [...newTeams[teamIndex].members];
      
      // Reseteamos el slot generando un nuevo ID y limpiando los datos
      newMembers[memberIndex] = { slotId: crypto.randomUUID(), pokemonId: null, name: null, sprite: null };
      newTeams[teamIndex] = { ...newTeams[teamIndex], members: newMembers };

      return { teams: newTeams };
    }),

  // Borrar un equipo completo de la lista
  deleteTeam: (teamId) =>
    set((state) => ({
      teams: state.teams.filter(t => t.id !== teamId),
      // Si borras el equipo en el que estás actualmente, te devuelve a la lista
      activeTeamId: state.activeTeamId === teamId ? null : state.activeTeamId
    })),
}));