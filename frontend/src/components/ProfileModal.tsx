import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trophy, Skull, User, Link as LinkIcon, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onUpdate: () => void;
}

export default function ProfileModal({ isOpen, onClose, userId, onUpdate }: ProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    avatar_url: '',
    wins: 0,
    losses: 0
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
    }
  }, [isOpen, userId]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url, wins, losses')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
  };

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        username: profile.username,
        avatar_url: profile.avatar_url
      })
      .eq('id', userId);

    if (!error) {
      onUpdate();
      onClose();
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col md:flex-row"
            >
              {/* Lateral Izquierdo: Avatar y Stats */}
              <div className="w-full md:w-1/3 bg-gray-950/50 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-800">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-1">
                    <img 
                      src={profile.avatar_url || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/778.png'} 
                      className="w-full h-full rounded-full bg-gray-900 object-contain p-2"
                      alt="Avatar"
                    />
                  </div>
                </div>
                
                <h2 className="mt-4 text-xl font-bold text-white text-center">{profile.username}</h2>
                
                <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                  <div className="bg-gray-900 p-3 rounded-2xl border border-gray-800 text-center">
                    <Trophy className="text-yellow-500 mx-auto mb-1" size={20} />
                    <span className="block text-lg font-bold text-white">{profile.wins}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Victorias</span>
                  </div>
                  <div className="bg-gray-900 p-3 rounded-2xl border border-gray-800 text-center">
                    <Skull className="text-red-500 mx-auto mb-1" size={20} />
                    <span className="block text-lg font-bold text-white">{profile.losses}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Derrotas</span>
                  </div>
                </div>
              </div>

              {/* Lado Derecho: Configuración */}
              <div className="flex-1 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Ajustes de Perfil</h3>
                  <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={24} /></button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Nombre de Usuario</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-500" size={18} />
                      <input 
                        type="text" 
                        value={profile.username}
                        onChange={(e) => setProfile({...profile, username: e.target.value})}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-pink-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">URL del Avatar (Pokémon Sprite)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 text-gray-500" size={18} />
                      <input 
                        type="text" 
                        value={profile.avatar_url}
                        onChange={(e) => setProfile({...profile, avatar_url: e.target.value})}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-pink-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}