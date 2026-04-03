import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTeamStore } from '../store/useTeamStore';
import { Plus, X, ArrowLeft, Trash2, Edit2, Download, Save, Loader2, Share2, Activity } from 'lucide-react';
import PokemonSearchModal from '../components/PokemonSearchModal';
import PokemonEditor from '../components/PokemonEditor';
import ShowdownImportModal from '../components/ShowdownImportModal';
import ShowdownExportModal from '../components/ShowdownExportModal';
import TeamSynergyModal from '../components/TeamSynergyModal';

export default function TeamBuilder() {
  const { 
    teams, activeTeamId, isLoading, isSaving, 
    fetchTeams, saveTeam, createNewTeam, setActiveTeam, 
    deleteTeam, updateTeam, removeTeamMember, updateTeamMember 
  } = useTeamStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSynergyOpen, setIsSynergyOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const activeTeam = teams.find(t => t.id === activeTeamId);

  const handleOpenSearch = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setIsSearchOpen(true);
  };

  const handleSelectPokemon = (pokemon: { id: number; name: string; sprite: string }) => {
    if (activeTeamId && selectedSlot !== null) {
      updateTeamMember(activeTeamId, selectedSlot, {
        pokemonId: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprite
      });
    }
    setIsSearchOpen(false);
    setSelectedSlot(null);
  };

  return (
    <div className="min-h-screen p-8 text-white bg-gray-950">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center gap-4 mb-2">
          {activeTeam && (
            <button 
              onClick={() => setActiveTeam(null)}
              className="p-2 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 hover:text-pink-400 transition-all text-gray-400 shrink-0"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          
          {activeTeam ? (
            <div className="relative flex-1 group">
              <input
                type="text"
                value={activeTeam.name}
                onChange={(e) => updateTeam(activeTeam.id, { name: e.target.value })}
                className="w-full text-4xl font-bold bg-transparent text-white border-b-2 border-transparent focus:border-pink-500 outline-none transition-colors pb-1 placeholder:text-gray-700"
                placeholder="Nombre del equipo..."
              />
              <Edit2 size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-600 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
            </div>
          ) : (
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500"
            >
              Team Builder
            </motion.h1>
          )}
        </div>
        
        {activeTeam ? (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-medium">Formato:</span>
              <select
                value={activeTeam.format}
                onChange={(e) => updateTeam(activeTeam.id, { format: e.target.value as any })}
                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-pink-500 focus:border-pink-500 block px-3 py-1.5 outline-none"
              >
                <option value="VGC">VGC (Dobles)</option>
                <option value="Singles">Singles (OU)</option>
                <option value="Custom">Custom / Sin Reglas</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setIsSynergyOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-800 hover:text-white transition-all"
              >
                <Activity size={16} className="text-blue-400" />
                <span className="hidden sm:inline">Sinergia</span>
              </button>

              <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setIsImportOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-300 text-sm font-semibold hover:bg-gray-800 hover:text-white transition-all border-r border-gray-800"
                >
                  <Download size={16} className="text-pink-500" />
                  <span className="hidden sm:inline">Importar</span>
                </button>
                <button 
                  onClick={() => setIsExportOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-300 text-sm font-semibold hover:bg-gray-800 hover:text-white transition-all"
                >
                  <Share2 size={16} className="text-pink-500" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              </div>
              
              <button 
                onClick={() => saveTeam(activeTeam.id)}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-70 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-pink-500/20 ml-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Guardando...' : <span className="hidden sm:inline">Guardar Equipo</span>}
              </button>
            </div>
          </div>
        ) : (
          isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
            </div>
          ) : (
             <p className="mb-8 text-gray-400">Construye tus equipos, importa tus estrategias y prepárate para dominar el meta.</p>
          )
        )}

        {!activeTeam && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={() => createNewTeam(`Equipo ${teams.length + 1}`)}
                className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-500/20"
              >
                <Plus size={20} />
                Crear Nuevo Equipo
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 bg-gray-900/30 border border-gray-800/50 rounded-2xl border-dashed">
                <p className="text-gray-500 mb-4">Aún no tienes ningún equipo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <motion.div 
                    key={team.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-pink-500/50 transition-all group cursor-pointer flex flex-col justify-between min-h-[160px]"
                    onClick={() => setActiveTeam(team.id)}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-pink-400 transition-colors truncate pr-2">{team.name}</h3>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteTeam(team.id); }}
                          className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 bg-gray-800 text-gray-400 rounded-md">
                        {team.format}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-1 bg-gray-950/50 p-2 rounded-xl justify-between border border-gray-800/50">
                      {team.members.map((m, i) => (
                        <div key={i} className="w-10 h-10 flex items-center justify-center bg-gray-900/80 rounded-lg border border-gray-800">
                          {m.sprite ? (
                            <img src={m.sprite} alt="sprite" className="w-8 h-8 object-contain drop-shadow-md" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-700/50" />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTeam && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTeam.members.map((member, index) => (
              <motion.div 
                key={member.slotId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative p-6 border rounded-2xl bg-gray-900/50 border-gray-800 hover:border-pink-500/50 transition-colors h-48 flex flex-col items-center justify-center group"
              >
                {member.pokemonId ? (
                  <>
                    <button 
                      onClick={() => removeTeamMember(activeTeam.id, index)}
                      className="absolute top-3 right-3 p-1.5 bg-gray-950 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      <X size={18} />
                    </button>
                    <img src={member.sprite!} alt={member.name!} className="w-24 h-24 object-contain drop-shadow-lg" />
                    <p className="mt-2 font-bold capitalize text-white">{member.name}</p>
                    
                    <button 
                      onClick={() => setEditingSlot(index)}
                      className="absolute bottom-3 px-3 py-1 bg-pink-600/10 text-xs text-pink-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-medium hover:bg-pink-600/20"
                    >
                      Editar Stats & Moves →
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleOpenSearch(index)}
                    className="flex flex-col items-center justify-center w-full h-full text-gray-600 hover:text-pink-400 transition-colors"
                  >
                    <Plus size={32} className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="font-medium">Añadir Pokémon</span>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <PokemonSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={handleSelectPokemon} />

        {/* AQUÍ ESTABA EL ERROR: Solo los renderizamos una vez al final del archivo */}
        {activeTeam && (
          <>
            <ShowdownImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} teamId={activeTeam.id} />
            <ShowdownExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} team={activeTeam} />
            <TeamSynergyModal isOpen={isSynergyOpen} onClose={() => setIsSynergyOpen(false)} team={activeTeam} />
            <PokemonEditor teamId={activeTeam.id} memberIndex={editingSlot} onClose={() => setEditingSlot(null)} />
          </>
        )}

      </div>
    </div>
  );
}