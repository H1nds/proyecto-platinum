import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Swords, Settings, LogOut } from 'lucide-react';
import { UserPlus, Bell } from 'lucide-react';
import FriendRequestsModal from '../components/FriendRequestsModal';
import ProfileModal from '../components/ProfileModal';
import FriendSearchModal from '../components/FriendSearchModal';
import { supabase } from '../utils/supabase';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('Cargando...');
  const [userId, setUserId] = useState<string | null>(null);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Función maestra que extrae los amigos y solicitudes desde Supabase
  const loadSocialData = async (uid: string) => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        sender:profiles!friendships_sender_id_fkey(id, username, avatar_url),
        receiver:profiles!friendships_receiver_id_fkey(id, username, avatar_url)
      `)
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

    if (error) {
      console.error("Error cargando datos sociales:", error);
      return;
    }

    const loadedFriends: any[] = [];
    const loadedRequests: any[] = [];

    data?.forEach((row: any) => {
      // Si el estado es pendiente y TÚ eres el receptor, va al buzón
      if (row.status === 'pending' && row.receiver?.id === uid) {
        loadedRequests.push({ friendshipId: row.id, sender: row.sender });
      } 
      // Si el estado es aceptado, se añade a la lista de amigos (extraemos el perfil del otro)
      else if (row.status === 'accepted') {
        const friendProfile = row.sender?.id === uid ? row.receiver : row.sender;
        loadedFriends.push({ friendshipId: row.id, profile: friendProfile });
      }
    });

    setFriends(loadedFriends);
    setPendingRequests(loadedRequests);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }

      const realName = session.user.user_metadata?.username;
      setUsername(realName || 'Entrenador');
      setUserId(session.user.id);
      
      // Llamamos a la base de datos para cargar la barra lateral
      loadSocialData(session.user.id);
    };

    checkSession();
  }, [navigate]);

  // Motor de Presencia en Tiempo Real
  useEffect(() => {
    if (!userId) return;

    // Creamos un canal global de presencia
    const presenceChannel = supabase.channel('platinum_presence', {
      config: {
        presence: {
          key: userId, // Tu ID será tu identificador en el canal
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // Cuando alguien entra o sale, Supabase sincroniza el estado
        const state = presenceChannel.presenceState();
        // Extraemos solo las llaves (los IDs de los usuarios conectados)
        const onlineIds = Object.keys(state);
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Una vez suscrito exitosamente, anunciamos nuestra entrada
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    // Función de limpieza: si cierras sesión o la app, te desconectas del canal
    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/'); 
  };

  const navItems = [
    { name: 'Lobby', path: '/dashboard', icon: <Home size={20} /> },
    { name: 'Team Builder', path: '/teambuilder', icon: <Swords size={20} /> },
  ];

  // La barra lateral extraída para poder usarla en PC y Móvil
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-900/80 backdrop-blur-xl border-r border-gray-800/50">
      <div className="p-6 border-b border-gray-800/50">
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-4 w-full text-left hover:bg-gray-800/30 p-2 rounded-2xl transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 p-[2px] shrink-0">
            <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center overflow-hidden">
              {/* Aquí usamos una imagen genérica mientras carga el perfil real */}
              <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/778.png" alt="Avatar" className="w-10 h-10 object-contain" />
            </div>
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-white leading-tight truncate">{username}</h3>
            <p className="text-xs text-green-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Online
            </p>
          </div>
        </button>
      </div>

      <div className="p-4 flex-1">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Menú</h4>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' 
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-gray-500 mb-4 px-2 shrink-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider">Amigos</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => { setIsMobileMenuOpen(false); setIsRequestsModalOpen(true); }}
                className="relative p-1 hover:text-pink-400 hover:bg-pink-500/10 rounded-md transition-colors"
                title="Buzón de Solicitudes"
              >
                <Bell size={16} />
                {/* Indicador rojo brillante si hay solicitudes pendientes */}
                {pendingRequests.length > 0 && (
                  <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500 border border-gray-900"></span>
                  </span>
                )}
              </button>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); setIsFriendModalOpen(true); }}
                className="p-1 hover:text-pink-400 hover:bg-pink-500/10 rounded-md transition-colors"
                title="Añadir amigo"
              >
                <UserPlus size={16} />
              </button>
            </div>
          </div>
          
          {/* Lista de amigos con scroll nativo oculto y fluido */}
          <div className="space-y-2 overflow-y-auto pr-2 pb-4">
            {friends.length === 0 ? (
              <p className="text-xs italic text-gray-600 px-2">Aún no hay amigos agregados.</p>
            ) : (
              friends.map((friend) => {
                // Verificamos si el ID del amigo está en la lista de conectados
                const isOnline = onlineUsers.includes(friend.profile.id);
                
                return (
                  <div key={friend.friendshipId} className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white cursor-pointer transition-all group">
                    <div className="relative">
                      <img src={friend.profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full bg-gray-800 p-0.5 object-contain border border-gray-700" />
                      {/* Indicador de estado dinámico, verde si está online, gris si está offline */}
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-gray-900 rounded-full transition-colors duration-300 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium truncate">{friend.profile.username}</span>
                      <span className="text-[10px] text-gray-500 leading-none mt-0.5">
                        {isOnline ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
      </div>

      <div className="p-4 border-t border-gray-800/50">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-white selection:bg-pink-500 selection:text-white">
        <FriendSearchModal 
        isOpen={isFriendModalOpen} 
        onClose={() => setIsFriendModalOpen(false)} 
        currentUserId={userId} 
      />
      <FriendRequestsModal 
        isOpen={isRequestsModalOpen} 
        onClose={() => setIsRequestsModalOpen(false)} 
        requests={pendingRequests}
        onUpdate={() => userId && loadSocialData(userId)}
      />
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={userId}
        onUpdate={() => {
          // Esta función recargará el nombre en la barra lateral cuando lo cambies
          const reload = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
              if (data) setUsername(data.username);
            }
          };
          reload();
        }}
      />
      {/* Barra lateral para PC (Oculta en móviles) */}
      <div className="hidden md:block w-72 h-full z-20">
        <SidebarContent />
      </div>

      {/* Menú deslizante para Móviles */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="md:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contenido Central */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Cabecera Móvil (Solo se ve en celulares) */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 z-30">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
            Proyecto Platinum
          </h2>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
            <Menu size={24} />
          </button>
        </div>

        {/* Aquí es donde React renderiza la "foto" (Dashboard, TeamBuilder, etc.) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {/* Luces de fondo globales para el contenido central */}
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-purple-600/10 blur-[128px] rounded-full pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}