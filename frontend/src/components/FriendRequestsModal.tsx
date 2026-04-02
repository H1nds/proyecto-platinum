import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Inbox } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: any[];
  onUpdate: () => void; // Función para actualizar la barra lateral al aceptar/rechazar
}

export default function FriendRequestsModal({ isOpen, onClose, requests, onUpdate }: FriendRequestsModalProps) {
  
  const handleAccept = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      
      if (error) throw error;
      onUpdate(); // Recarga la lista de amigos
    } catch (err) {
      console.error('Error al aceptar solicitud:', err);
    }
  };

  const handleReject = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      
      if (error) throw error;
      onUpdate(); // Actualiza la lista
    } catch (err) {
      console.error('Error al rechazar solicitud:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Inbox className="text-pink-500" size={20} />
                  <h3 className="text-lg font-bold text-white">Buzón de Solicitudes</h3>
                </div>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800">
                  <X size={20} />
                </button>
              </div>

              <div className="p-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <Inbox size={48} className="mb-4 opacity-20" />
                    <p className="text-sm text-center">No tienes solicitudes pendientes.</p>
                  </div>
                ) : (
                  requests.map((req) => (
                    <div key={req.friendshipId} className="flex items-center justify-between p-3 rounded-xl bg-gray-950/50 border border-gray-800/50 mb-2">
                      <div className="flex items-center gap-3">
                        <img src={req.sender.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full bg-gray-800 p-1 object-contain border border-gray-700" />
                        <div>
                          <span className="font-medium text-white block">{req.sender.username}</span>
                          <span className="text-xs text-gray-500 block">Quiere ser tu amigo</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleAccept(req.friendshipId)}
                          className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                          title="Aceptar"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(req.friendshipId)}
                          className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                          title="Rechazar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}