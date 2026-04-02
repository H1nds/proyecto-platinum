import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

// Definimos qué datos esperamos recibir del componente padre
interface FriendSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
}

// Definimos la forma de los perfiles que nos devolverá Supabase
interface ProfileResult {
  id: string;
  username: string;
  avatar_url: string;
}

export default function FriendSearchModal({ isOpen, onClose, currentUserId }: FriendSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [existingConnections, setExistingConnections] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Obtiene todas tus conexiones (amigos o solicitudes pendientes/enviadas) al abrir el modal
  useEffect(() => {
    const fetchConnections = async () => {
      if (!isOpen || !currentUserId) return;
      
      const { data } = await supabase
        .from('friendships')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
      
      if (data) {
        const connections = new Set<string>();
        data.forEach(row => {
          connections.add(row.sender_id === currentUserId ? row.receiver_id : row.sender_id);
        });
        setExistingConnections(connections);
      }
    };
    fetchConnections();
  }, [isOpen, currentUserId]);

  // Efecto que busca en vivo mientras escribes (con un pequeño retraso para no saturar la BD)
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !currentUserId) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        // Buscamos perfiles que contengan el texto, ignorando mayúsculas/minúsculas (ilike)
        // y nos aseguramos de no mostrar tu propio perfil (.neq)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${searchQuery}%`)
          .neq('id', currentUserId)
          .limit(5);

        if (error) throw error;
        setResults(data || []);
      } catch (err: any) {
        setError('Error al buscar usuarios.');
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    // "Debounce": Espera 500ms después de que dejas de escribir para buscar
    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUserId]);

  const handleSendRequest = async (receiverId: string) => {
    if (!currentUserId) return;
    
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId
        });

      if (error) {
        // Si el error es por violar la regla "unique" (ya le enviaste solicitud)
        if (error.code === '23505') throw new Error('Ya enviaste una solicitud a este usuario.');
        throw error;
      }

      // Añadimos el ID a la lista de "Enviados" para cambiar el botón a verde
      setSentRequests(prev => new Set(prev).add(receiverId));
    } catch (err: any) {
      alert(err.message || 'Error al enviar la solicitud.');
    }
  };

  // Resetea el estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setSentRequests(new Set());
      setExistingConnections(new Set());
      setError(null);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Fondo oscuro desenfocado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Contenedor del Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white">Añadir Amigo</h3>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800">
                  <X size={20} />
                </button>
              </div>

              {/* Buscador */}
              <div className="p-4 border-b border-gray-800/50 bg-gray-950/50">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nombre de usuario..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-4 text-sm text-white bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all placeholder-gray-500"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-pink-500">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Resultados de Búsqueda */}
              <div className="p-2 min-h-[200px] max-h-[300px] overflow-y-auto">
                {error && <p className="p-4 text-sm text-center text-red-400">{error}</p>}
                
                {!isSearching && searchQuery.trim() && results.length === 0 && !error && (
                  <p className="p-8 text-sm text-center text-gray-500">No se encontraron entrenadores con ese nombre.</p>
                )}

                {!searchQuery.trim() && (
                  <p className="p-8 text-sm text-center text-gray-500">Escribe un nombre para empezar a buscar.</p>
                )}

                {results.map((profile) => {
                  const isSent = sentRequests.has(profile.id);
                  const isAlreadyConnected = existingConnections.has(profile.id);

                  return (
                    <div key={profile.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full bg-gray-800 p-1 object-contain border border-gray-700" />
                        <span className="font-medium text-white">{profile.username}</span>
                      </div>
                      
                      {isAlreadyConnected ? (
                        <span className="text-xs font-medium text-gray-500 bg-gray-800 px-2 py-1 rounded-md border border-gray-700">
                          Conectados
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(profile.id)}
                          disabled={isSent}
                          className={`flex items-center justify-center p-2 rounded-lg transition-all ${
                            isSent 
                              ? 'bg-green-500/20 text-green-400 cursor-default' 
                              : 'bg-pink-500 text-white hover:bg-pink-400 active:scale-95'
                          }`}
                          title={isSent ? 'Solicitud enviada' : 'Enviar solicitud de amistad'}
                        >
                          {isSent ? <Check size={18} /> : <UserPlus size={18} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}