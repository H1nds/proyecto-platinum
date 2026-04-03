import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity } from 'lucide-react';
import { Team } from '@pkmn/sets';
import { Dex } from '@pkmn/dex';

const ALL_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 
  'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

interface TeamSynergyModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
}

export default function TeamSynergyModal({ isOpen, onClose, team }: TeamSynergyModalProps) {
  
  // ESCUDO DEFINITIVO PARA TYPESCRIPT: 
  // Mapeamos los datos para crear 'safeName' y 'safeSprite' que están garantizados como textos (strings)
  const validMembers = (team?.members && Array.isArray(team.members)) 
    ? team.members
        .filter(p => p && p.pokemonId && p.name)
        .map(p => ({
          ...p,
          safeName: String(p.name),
          safeSprite: String(p.sprite)
        }))
    : [];

  const getMultiplier = (pokemonName: string, attackingType: string) => {
    try {
      if (!pokemonName) return 1;
      const species = Dex.species.get(pokemonName);
      if (!species || !species.types) return 1;

      let multiplier = 1;
      for (const defType of species.types) {
        const typeData = Dex.types.get(defType);
        if (!typeData) continue;
        
        const damageTaken = typeData.damageTaken[attackingType];
        if (damageTaken === 1) multiplier *= 2;
        else if (damageTaken === 2) multiplier *= 0.5;
        else if (damageTaken === 3) multiplier *= 0;
      }
      return multiplier;
    } catch (error) {
      return 1;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity size={24} className="text-pink-500" />
                  Análisis de Sinergia
                </h2>
                <p className="text-xs text-gray-400 mt-1">Evalúa las debilidades y resistencias de tu equipo actual.</p>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase mb-4 px-2">
                <div className="col-span-3">Tipo Atacante</div>
                <div className="col-span-4 text-red-400">Débiles (2x / 4x)</div>
                <div className="col-span-5 text-green-400">Resisten / Inmunes (0.5x / 0x)</div>
              </div>

              <div className="space-y-2">
                {ALL_TYPES.map(type => {
                  // Ahora usamos safeName, por lo que la línea roja desaparecerá de inmediato
                  const weakPokemon = validMembers.filter(p => getMultiplier(p.safeName, type) > 1);
                  const resistPokemon = validMembers.filter(p => getMultiplier(p.safeName, type) < 1);

                  return (
                    <div key={type} className="grid grid-cols-12 gap-4 items-center bg-gray-950/50 p-2 rounded-xl border border-gray-800/50 hover:border-pink-500/30 transition-colors">
                      <div className="col-span-3 font-bold text-gray-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-500/50"></span>
                        {type}
                      </div>

                      <div className="col-span-4 flex flex-wrap gap-2">
                        {weakPokemon.length === 0 ? <span className="text-gray-600 text-xs italic py-2">Ninguno</span> : null}
                        {weakPokemon.map(p => (
                          <div key={p.slotId} className="relative group">
                            <img src={p.safeSprite} alt={p.safeName} className="w-8 h-8 object-contain drop-shadow" />
                            <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-red-500/20 text-red-400 px-1 rounded ring-1 ring-red-500/50">
                              {getMultiplier(p.safeName, type)}x
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="col-span-5 flex flex-wrap gap-2">
                        {resistPokemon.length === 0 ? <span className="text-gray-600 text-xs italic py-2">Ninguno</span> : null}
                        {resistPokemon.map(p => (
                          <div key={p.slotId} className="relative group">
                            <img src={p.safeSprite} alt={p.safeName} className="w-8 h-8 object-contain drop-shadow" />
                            <span className={`absolute -top-2 -right-2 text-[9px] font-bold px-1 rounded ring-1 ${getMultiplier(p.safeName, type) === 0 ? 'bg-blue-500/20 text-blue-400 ring-blue-500/50' : 'bg-green-500/20 text-green-400 ring-green-500/50'}`}>
                              {getMultiplier(p.safeName, type)}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}