import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTeamStore } from '../store/useTeamStore';
import { Dex } from '@pkmn/dex';
import { useMemo } from 'react';

interface PokemonEditorProps {
  teamId: string;
  memberIndex: number | null;
  onClose: () => void;
}

export default function PokemonEditor({ teamId, memberIndex, onClose }: PokemonEditorProps) {
  const { teams, updateTeamMember } = useTeamStore();

  // Generamos las listas de autocompletado usando la base de datos de Showdown
  const allItems = useMemo(() => Array.from(Dex.items.all()), []);
  const allAbilities = useMemo(() => Array.from(Dex.abilities.all()), []);
  const allMoves = useMemo(() => Array.from(Dex.moves.all()), []);
  const allNatures = useMemo(() => Array.from(Dex.natures.all()), []);

  if (memberIndex === null) return null;

  const activeTeam = teams.find(t => t.id === teamId);
  const pokemon = activeTeam?.members[memberIndex];

  if (!pokemon || !pokemon.pokemonId) return null;

  const handleChange = (changes: Partial<typeof pokemon>) => {
    updateTeamMember(teamId, memberIndex, changes);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-gray-950 border-l border-gray-800 shadow-2xl flex flex-col overflow-y-auto custom-scrollbar"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
          <div className="flex items-center gap-4">
            <img src={pokemon.sprite!} alt={pokemon.name!} className="w-16 h-16 drop-shadow-md object-contain" />
            <h2 className="text-2xl font-bold text-white capitalize">{pokemon.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          
          {/* Objeto, Habilidad y Naturaleza */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Objeto (Item)</label>
              <input 
                list="items-list"
                value={pokemon.item || ''}
                onChange={(e) => handleChange({ item: e.target.value })}
                placeholder="Ej. Life Orb..."
                className="w-full py-2.5 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-pink-500 transition-colors"
              />
              <datalist id="items-list">
                {allItems.map(item => <option key={item.id} value={item.name} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Habilidad (Ability)</label>
              <input 
                list="abilities-list"
                value={pokemon.ability || ''}
                onChange={(e) => handleChange({ ability: e.target.value })}
                placeholder="Ej. Disguise..."
                className="w-full py-2.5 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-pink-500 transition-colors"
              />
              <datalist id="abilities-list">
                {allAbilities.map(ability => <option key={ability.id} value={ability.name} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Naturaleza (Nature)</label>
              <input 
                list="natures-list"
                value={pokemon.nature || ''}
                onChange={(e) => handleChange({ nature: e.target.value })}
                placeholder="Ej. Jolly..."
                className="w-full py-2.5 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-pink-500 transition-colors"
              />
              <datalist id="natures-list">
                {allNatures.map(nature => <option key={nature.id} value={nature.name} />)}
              </datalist>
            </div>
          </div>

          {/* Movimientos */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-3">Movimientos (Moves)</label>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((moveIndex) => (
                <div key={moveIndex}>
                  <input 
                    list="moves-list"
                    value={pokemon.moves?.[moveIndex] || ''}
                    onChange={(e) => {
                      const newMoves = [...(pokemon.moves || ['', '', '', ''])];
                      newMoves[moveIndex] = e.target.value;
                      handleChange({ moves: newMoves });
                    }}
                    placeholder={`Movimiento ${moveIndex + 1}`}
                    className="w-full py-2.5 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-pink-500 transition-colors"
                  />
                </div>
              ))}
              <datalist id="moves-list">
                {allMoves.map(move => <option key={move.id} value={move.name} />)}
              </datalist>
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}