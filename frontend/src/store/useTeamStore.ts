import { create } from 'zustand';
import { supabase } from '../utils/supabase';

export interface TeamMember {
  slotId: string;
  pokemonId: number | null;
  name: string | null;
  sprite: string | null;
  item: string;
  ability: string;
  nature: string;
  level: number;
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  moves: string[];
}

export interface Team {
  id: string;
  name: string;
  format: 'VGC' | 'Singles' | 'Custom';
  members: TeamMember[];
}

interface TeamBuilderState {
  teams: Team[];
  activeTeamId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  
  fetchTeams: () => Promise<void>;
  saveTeam: (teamId: string) => Promise<void>;
  createNewTeam: (name: string, format?: 'VGC' | 'Singles' | 'Custom') => void;
  setActiveTeam: (teamId: string | null) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  updateTeamMember: (teamId: string, memberIndex: number, pokemonInfo: Partial<TeamMember>) => void;
  removeTeamMember: (teamId: string, memberIndex: number) => void;
  importTeam: (teamId: string, importedMembers: Partial<TeamMember>[]) => void;
  deleteTeam: (teamId: string) => Promise<void>;
}

const createEmptySlots = (): TeamMember[] => 
  Array.from({ length: 6 }).map(() => ({
    slotId: crypto.randomUUID(),
    pokemonId: null,
    name: null,
    sprite: null,
    item: '',
    ability: '',
    nature: 'Serious',
    level: 50,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ['', '', '', ''],
  }));

export const useTeamStore = create<TeamBuilderState>((set, get) => ({
  teams: [],
  activeTeamId: null,
  isLoading: false,
  isSaving: false,

  fetchTeams: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return set({ isLoading: false });

    const { data, error } = await supabase.from('teams').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true });
    if (!error && data) {
      const loadedTeams: Team[] = data.map(row => ({ id: row.id, name: row.name, format: row.format as any, members: row.members }));
      set({ teams: loadedTeams, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  saveTeam: async (teamId) => {
    set({ isSaving: true });
    const state = get();
    const teamToSave = state.teams.find(t => t.id === teamId);
    if (!teamToSave) return set({ isSaving: false });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return set({ isSaving: false });

    const { error } = await supabase.from('teams').upsert({
      id: teamToSave.id,
      user_id: session.user.id,
      name: teamToSave.name,
      format: teamToSave.format,
      members: teamToSave.members
    });
    
    if (error) console.error("Error al guardar:", error);
    set({ isSaving: false });
  },

  deleteTeam: async (teamId) => {
    set((state) => ({ teams: state.teams.filter(t => t.id !== teamId), activeTeamId: state.activeTeamId === teamId ? null : state.activeTeamId }));
    await supabase.from('teams').delete().eq('id', teamId);
  },

  createNewTeam: (name, format = 'VGC') => 
    set((state) => {
      const newTeam: Team = { id: crypto.randomUUID(), name, format, members: createEmptySlots() };
      return { teams: [...state.teams, newTeam], activeTeamId: newTeam.id };
    }),

  setActiveTeam: (teamId) => set({ activeTeamId: teamId }),

  updateTeam: (teamId, updates) =>
    set((state) => ({ teams: state.teams.map((t) => t.id === teamId ? { ...t, ...updates } : t) })),

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

  removeTeamMember: (teamId, memberIndex) =>
    set((state) => {
      const teamIndex = state.teams.findIndex(t => t.id === teamId);
      if (teamIndex === -1) return state;
      const newTeams = [...state.teams];
      const newMembers = [...newTeams[teamIndex].members];
      newMembers[memberIndex] = { slotId: crypto.randomUUID(), pokemonId: null, name: null, sprite: null, item: '', ability: '', nature: 'Serious', level: 50, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, moves: ['', '', '', ''] };
      newTeams[teamIndex] = { ...newTeams[teamIndex], members: newMembers };
      return { teams: newTeams };
    }),

  importTeam: (teamId, importedMembers) =>
    set((state) => {
      const teamIndex = state.teams.findIndex(t => t.id === teamId);
      if (teamIndex === -1) return state;
      const newTeams = [...state.teams];
      const currentMembers = [...newTeams[teamIndex].members];
      for (let i = 0; i < 6; i++) {
        if (importedMembers[i]) {
          currentMembers[i] = { ...currentMembers[i], ...importedMembers[i] };
        }
      }
      newTeams[teamIndex] = { ...newTeams[teamIndex], members: currentMembers };
      return { teams: newTeams };
    }),
}));