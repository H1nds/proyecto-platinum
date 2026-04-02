import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';

interface PokemonSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pokemon: { id: number; name: string; sprite: string }) => void;
}

// Interfaz para la respuesta inicial de PokéAPI
interface ApiListItem {
  name: string;
  url: string;
}

interface ProcessedPokemon {
  id: number;
  name: string;
  sprite: string;
}

export default function PokemonSearchModal({ isOpen, onClose, onSelect }: PokemonSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pokemonList, setPokemonList] = useState<ProcessedPokemon[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar la lista maestra de Pokémon solo una vez
  useEffect(() => {
    if (!isOpen || pokemonList.length > 0) return;

    const fetchMasterList = async () => {
      setIsLoading(true);
      try {
        // Traemos hasta la generación 9 (1025 Pokémon)
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
        const data = await res.json();
        
        const processedList = data.results.map((item: ApiListItem) => {
          // Extraemos el ID de la url (ej: "https://pokeapi.co/api/v2/pokemon/25/")
          const parts = item.url.split('/');
          const id = parseInt(parts[parts.length - 2]);
          
          return {
            id,
            name: item.name,
            sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
          };
        });

        setPokemonList(processedList);
      } catch (error) {
        console.error("Error cargando la PokéAPI", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasterList();
  }, [isOpen, pokemonList.length]);

  // Filtrar la lista basándonos en el input
  const filteredPokemon = pokemonList.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl shadow-pink-500/10"
        >
          {/* Cabecera y Buscador */}
          <div className="p-4 border-b border-gray-800 bg-gray-950/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Buscar Pokémon</h2>
              <button onClick={onClose} className="p-1 text-gray-400 transition-colors hover:text-white rounded-lg hover:bg-gray-800">
                <X size={24} />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Nombre del Pokémon (ej. Mimikyu)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-3 pl-10 pr-4 text-white bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de Resultados */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 text-pink-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-gray-400 text-sm">Cargando Pokédex...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredPokemon.map((pokemon) => (
                  <button
                    key={pokemon.id}
                    onClick={() => onSelect(pokemon)}
                    className="flex flex-col items-center p-3 transition-all border border-gray-800 bg-gray-950/30 rounded-xl hover:border-pink-500 hover:bg-gray-800 group"
                  >
                    <img 
                      src={pokemon.sprite} 
                      alt={pokemon.name} 
                      className="w-16 h-16 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                      loading="lazy"
                    />
                    <span className="mt-2 text-sm font-medium text-gray-300 capitalize group-hover:text-white">
                      {pokemon.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {!isLoading && filteredPokemon.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                No se encontró ningún Pokémon con ese nombre.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}