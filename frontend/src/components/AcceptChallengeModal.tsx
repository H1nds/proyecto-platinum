import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, AlertTriangle } from 'lucide-react';
import { useTeamStore } from '../store/useTeamStore';
import { getFormatName } from '../utils/formats'; // Importamos el formateador de nombres

interface AcceptChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingChallenge: any; // Los datos del reto que recibimos
  onConfirm: (selectedTeamId: string) => void; // Función al aceptar
}

export default function AcceptChallengeModal({ isOpen, onClose, incomingChallenge, onConfirm }: AcceptChallengeModalProps) {
  const { teams, fetchTeams } = useTeamStore();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  useEffect(() => {
    if (isOpen && teams.length === 0) fetchTeams();
  }, [isOpen, teams.length, fetchTeams]);

  // --- FILTRO DE EQUIPOS VÁLIDOS ---
  // Solo mostramos equipos que tengan el MISMO formato que el reto entrante
  const validTeamsForFormat = useMemo(() => {
    if (!incomingChallenge) return [];
    return teams.filter(team => team.format === incomingChallenge.format);
  }, [teams, incomingChallenge]);

  // Autoseleccionar el primer equipo válido
  useEffect(() => {
    if (validTeamsForFormat.length > 0 && !selectedTeamId) {
      setSelectedTeamId(validTeamsForFormat[0].id);
    }
  }, [validTeamsForFormat, selectedTeamId]);

  if (!isOpen || !incomingChallenge) return null;

  const formatBonito = getFormatName(incomingChallenge.format);
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex flex-col items-center sm:justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0" />
        
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          className="relative w-full max-w-md bg-gray-900 border border-pink-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl mt-auto sm:mt-0 overflow-hidden"
        >
          {/* Cabecera con Ping */}
          <div className="p-5 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between relative">
            <div className="absolute inset-0 bg-pink-500/5 animate-pulse"></div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 relative">
              <Swords size={22} className="text-pink-500 animate-pulse" />
              Aceptar Desafío
            </h2>
            <button onClick={onClose} className="relative p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Info del Reto */}
            <div className="text-center p-4 bg-gray-950 rounded-xl border border-gray-800">
              <p className="text-sm text-gray-500">Formato propuesto:</p>
              <p className="text-lg font-bold text-pink-400 mt-1">{formatBonito}</p>
              <p className="text-xs text-gray-600 mt-1">por <span className="font-bold text-white">{incomingChallenge.challengerName}</span></p>
            </div>

            {/* Selector de Equipos Propios */}
            {validTeamsForFormat.length === 0 ? (
              <div className="text-center p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
                <p className="text-gray-200 font-medium">No tienes equipos válidos</p>
                <p className="text-sm text-gray-400">Para aceptar este desafío necesitas tener al menos un equipo guardado con el formato <span className="text-amber-400 font-bold">{formatBonito}</span>.</p>
                <button onClick={onClose} className="text-sm font-semibold text-pink-400 hover:text-pink-300">Volver</button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-3">Escoge TU equipo para este duelo:</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 text-white font-medium rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent block p-4 outline-noneappearance-none truncate shadow-inner"
                  >
                    {validTeamsForFormat.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                {/* Vista previa alineación */}
                {selectedTeam && (
                  <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                    <div className="flex justify-between gap-2">
                      {selectedTeam.members.map((m, i) => (
                        <div key={i} className="w-12 h-12 flex items-center justify-center bg-gray-900 rounded-lg border border-gray-800 overflow-hidden shadow-inner p-1">
                          {m.sprite ? <img src={m.sprite} alt="..." className="w-10 h-10 object-contain drop-shadow" /> : <div className="w-2 h-2 rounded-full bg-gray-700" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => selectedTeamId && onConfirm(selectedTeamId)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-500/20 active:scale-95"
                >
                  <Swords size={20} />
                  ¡Entrar a la Batalla!
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}