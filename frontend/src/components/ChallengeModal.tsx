import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, ShieldAlert } from 'lucide-react';
import { useTeamStore } from '../store/useTeamStore';
import { supabase } from '../utils/supabase';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendName: string;
}

export default function ChallengeModal({ isOpen, onClose, friendId, friendName }: ChallengeModalProps) {
  // Traemos los equipos del usuario desde nuestro store
  const { teams, fetchTeams } = useTeamStore();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  // Asegurarnos de tener los equipos cargados
  useEffect(() => {
    if (isOpen && teams.length === 0) {
      fetchTeams();
    }
  }, [isOpen, teams.length, fetchTeams]);

  // Autoseleccionar el primer equipo si no hay ninguno seleccionado
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const handleSendChallenge = async () => {
    if (!selectedTeamId) return;
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const teamToUse = teams.find(t => t.id === selectedTeamId);
      if (!teamToUse) throw new Error("Equipo no encontrado");

      // Insertamos el reto en Supabase
      const { error } = await supabase.from('challenges').insert({
        challenger_id: session.user.id,
        challenged_id: friendId,
        format: teamToUse.format,
        challenger_team: teamToUse.members // Enviamos nuestra alineación
      });

      if (error) throw error;
      
      onClose(); // Cerramos el modal si tuvo éxito
    } catch (error) {
      console.error("Error al enviar el reto:", error);
    } finally {
      setIsSending(false);
    }
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center sm:justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Capa para cerrar al hacer clic afuera */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0" />
          
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            // mt-auto lo pega abajo en móviles, sm:mt-0 lo centra en pantallas grandes
            className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl mt-auto sm:mt-0 overflow-hidden flex flex-col"
          >
            {/* Cabecera */}
            <div className="p-5 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Swords size={24} className="text-pink-500" />
                Retar a {friendName}
              </h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {teams.length === 0 ? (
                <div className="text-center p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-300 font-medium mb-1">No tienes equipos</p>
                  <p className="text-sm text-gray-500">Ve al Team Builder y crea al menos un equipo antes de retar a alguien.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-3">Elige tu Equipo para la Batalla</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 text-white font-medium rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent block p-4 outline-none appearance-none"
                    >
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.format})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vista previa del equipo seleccionado */}
                  {selectedTeam && (
                    <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                      <p className="text-xs text-gray-500 font-bold uppercase mb-3">Alineación</p>
                      <div className="flex justify-between gap-2">
                        {selectedTeam.members.map((m, i) => (
                          <div key={i} className="w-12 h-12 flex items-center justify-center bg-gray-900 rounded-lg border border-gray-800">
                            {m.sprite ? (
                              <img src={m.sprite} alt={m.name || 'Pokemon'} className="w-10 h-10 object-contain drop-shadow" />
                            ) : (
                              <span className="text-gray-700 font-bold text-xs">?</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSendChallenge}
                    disabled={isSending || !selectedTeamId}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-500/20 active:scale-95"
                  >
                    <Swords size={20} />
                    {isSending ? 'Enviando reto...' : `¡Desafiar en formato ${selectedTeam?.format || '...'}!`}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}