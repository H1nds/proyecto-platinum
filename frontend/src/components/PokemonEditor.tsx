import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTeamStore } from '../store/useTeamStore';
import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

const gens = new Generations(Dex);
const gen9 = gens.get(9);

const STAT_NAMES = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
const STAT_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

interface PokemonEditorProps {
  teamId: string;
  memberIndex: number | null;
  onClose: () => void;
}

export default function PokemonEditor({ teamId, memberIndex, onClose }: PokemonEditorProps) {
  const { teams, updateTeamMember } = useTeamStore();
  const [activeTab, setActiveTab] = useState<'general' | 'stats' | 'moves'>('general');
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  const allItems = useMemo(() => Array.from(Dex.items.all()), []);
  const allAbilities = useMemo(() => Array.from(Dex.abilities.all()), []);
  const allNatures = useMemo(() => Array.from(Dex.natures.all()), []);
  const allMovesFallback = useMemo(() => Array.from(Dex.moves.all()), []);

  if (memberIndex === null) return null;

  const activeTeam = teams.find(t => t.id === teamId);
  const pokemon = activeTeam?.members[memberIndex];

  if (!pokemon || !pokemon.pokemonId) return null;

  // --- 1. ELIMINAMOS LA LÍNEA ROJA DE TYPESCRIPT ---
  // Le decimos a TypeScript que esto es un texto seguro al 100%
  const pokemonNameSeguro = pokemon.name ? String(pokemon.name) : "";

  const handleChange = (changes: Partial<typeof pokemon>) => {
    updateTeamMember(teamId, memberIndex, changes);
  };

  useEffect(() => {
    async function loadLegalMoves() {
      if (!pokemonNameSeguro) return;
      try {
        // Usamos la variable segura, así que TypeScript no se va a quejar jamás
        const species = gen9.species.get(pokemonNameSeguro);
        if (!species) return;

        let learnset = await Dex.learnsets.get(species.id);
        if (!learnset || !learnset.learnset) {
          const baseSpecies = gen9.species.get(species.baseSpecies);
          if (baseSpecies) learnset = await Dex.learnsets.get(baseSpecies.id);
        }

        if (learnset && learnset.learnset) {
          const moveIds = Object.keys(learnset.learnset);
          const moveNames = moveIds.map(id => gen9.moves.get(id)?.name).filter(Boolean) as string[];
          setLegalMoves(moveNames);
        } else {
          setLegalMoves(allMovesFallback.map(m => m.name));
        }
      } catch (error) {
        setLegalMoves(allMovesFallback.map(m => m.name));
      }
    }
    loadLegalMoves();
  }, [pokemonNameSeguro, allMovesFallback]);


  // --- 2. ELIMINAMOS LA PANTALLA BLANCA DE ERROR DE 'hp' ---
  // Este "escudo" atrapa los datos dañados de Supabase y les pone 0
  const getSafeStat = (obj: any, statKey: string, fallback: number) => {
    if (obj && typeof obj === 'object' && statKey in obj) {
      const val = Number(obj[statKey]);
      return isNaN(val) ? fallback : val;
    }
    return fallback;
  };

  const speciesData = gen9.species.get(pokemonNameSeguro);
  const natureObj = gen9.natures.get(pokemon.nature || 'Serious');
  const safeLevel = Number(pokemon.level) || 50;

  const calculateStat = (statName: string, base: number, iv: number, ev: number, level: number, nature: any) => {
    if (statName === 'hp') {
      if (base === 1) return 1; 
      return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    } else {
      let raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
      if (nature) {
        if (nature.plus === statName) raw = Math.floor(raw * 1.1);
        if (nature.minus === statName) raw = Math.floor(raw * 0.9);
      }
      return raw;
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-gray-950 border-l border-gray-800 shadow-2xl flex flex-col">
        <div className="flex flex-col pt-6 px-6 pb-2 bg-gray-950/90 backdrop-blur-md border-b border-gray-800 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img src={pokemon.sprite!} alt={pokemon.name!} className="w-16 h-16 drop-shadow-md object-contain" />
              <div>
                <h2 className="text-2xl font-bold text-white capitalize leading-none">{pokemon.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Lvl</span>
                  <input type="number" min="1" max="100" value={safeLevel} onChange={e => handleChange({ level: Number(e.target.value) })} className="w-14 bg-gray-900 border border-gray-700 text-white text-xs text-center rounded focus:border-pink-500 outline-none" />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"><X size={24} /></button>
          </div>
          
          <div className="flex gap-4 border-b border-gray-800">
            {[{ id: 'general', label: 'General' }, { id: 'stats', label: 'Stats & EVs' }, { id: 'moves', label: 'Movimientos' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === tab.id ? 'text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}>
                {tab.label}
                {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Objeto (Item)</label>
                <input list="items-list" value={pokemon.item || ''} onChange={(e) => handleChange({ item: e.target.value })} className="w-full py-2.5 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-pink-500" />
                <datalist id="items-list">{allItems.map(i => <option key={i.id} value={i.name} />)}</datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Habilidad (Ability)</label>
                <input list="abilities-list" value={pokemon.ability || ''} onChange={(e) => handleChange({ ability: e.target.value })} className="w-full py-2.5 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-pink-500" />
                <datalist id="abilities-list">{allAbilities.map(a => <option key={a.id} value={a.name} />)}</datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Naturaleza (Nature)</label>
                <input list="natures-list" value={pokemon.nature || ''} onChange={(e) => handleChange({ nature: e.target.value })} className="w-full py-2.5 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-pink-500" />
                <datalist id="natures-list">{allNatures.map(n => <option key={n.id} value={n.name} />)}</datalist>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex text-xs font-bold text-gray-500 uppercase pb-2 border-b border-gray-800">
                <span className="w-10">Stat</span>
                <span className="w-10 text-center">Base</span>
                <span className="flex-1 text-center">EVs</span>
                <span className="w-14 text-center">EV</span>
                <span className="w-12 text-center">IV</span>
                <span className="w-12 text-right text-pink-400">Total</span>
              </div>
              
              {STAT_NAMES.map(stat => {
                const base = getSafeStat(speciesData?.baseStats, stat, 100);
                const ev = getSafeStat(pokemon.evs, stat, 0);
                const iv = getSafeStat(pokemon.ivs, stat, 31);
                const totalStat = calculateStat(stat, base, iv, ev, safeLevel, natureObj);
                
                return (
                  <div key={stat} className="flex items-center gap-2 text-sm group">
                    <span className="w-10 font-bold text-gray-400 uppercase">{STAT_LABELS[stat]}</span>
                    <span className="w-10 text-center text-gray-600 font-mono">{base}</span>
                    <input type="range" min="0" max="252" step="4" value={ev} onChange={e => handleChange({ evs: { ...(pokemon.evs || {}), [stat]: Number(e.target.value) } as any })} className="flex-1 accent-pink-500 cursor-pointer" />
                    <input type="number" min="0" max="252" value={ev} onChange={e => handleChange({ evs: { ...(pokemon.evs || {}), [stat]: Number(e.target.value) } as any })} className="w-14 bg-gray-900 border border-gray-800 rounded focus:border-pink-500 outline-none text-center text-white font-mono" />
                    <input type="number" min="0" max="31" value={iv} onChange={e => handleChange({ ivs: { ...(pokemon.ivs || {}), [stat]: Number(e.target.value) } as any })} className="w-12 bg-gray-900 border border-gray-800 rounded focus:border-pink-500 outline-none text-center text-white font-mono" />
                    <span className="w-12 font-bold text-pink-400 text-right font-mono bg-pink-500/10 px-1 py-0.5 rounded">{totalStat}</span>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'moves' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <p className="text-xs text-pink-400 mb-4 bg-pink-500/10 p-3 rounded-lg border border-pink-500/20">
                Mostrando movimientos legales que {pokemon.name} puede aprender.
              </p>
              {[0, 1, 2, 3].map((moveIndex) => (
                <div key={moveIndex}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slot {moveIndex + 1}</label>
                  <input list={`legal-moves-${moveIndex}`} value={pokemon.moves?.[moveIndex] || ''} onChange={(e) => { const newMoves = [...(pokemon.moves || ['', '', '', ''])]; newMoves[moveIndex] = e.target.value; handleChange({ moves: newMoves }); }} placeholder="Escribe para buscar..." className="w-full py-2.5 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-pink-500" />
                  <datalist id={`legal-moves-${moveIndex}`}>
                    {legalMoves.map(move => <option key={move} value={move} />)}
                  </datalist>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}