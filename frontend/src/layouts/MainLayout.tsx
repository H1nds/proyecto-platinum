import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Swords, LogOut, UserPlus, Bell } from 'lucide-react';
import FriendRequestsModal from '../components/FriendRequestsModal';
import ProfileModal from '../components/ProfileModal';
import FriendSearchModal from '../components/FriendSearchModal';
import ChallengeModal from '../components/ChallengeModal';
import AcceptChallengeModal from '../components/AcceptChallengeModal';
import { supabase } from '../utils/supabase';
import { useTeamStore } from '../store/useTeamStore';
import { getFormatName } from '../utils/formats';

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('Cargando...');
  const [avatarUrl, setAvatarUrl] = useState('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/778.png');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Estados para Modales Sociales
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Estados para Retos Entrantes (Cuando te desafían)
  const [incomingChallenge, setIncomingChallenge] = useState<any | null>(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);

  // NUEVO: Estados para Retos Salientes (Cuando tú desafías)
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeTargetId, setChallengeTargetId] = useState('');
  const [challengeTargetName, setChallengeTargetName] = useState('');
  const [outgoingChallenge, setOutgoingChallenge] = useState<any | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Datos sociales
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const loadSocialData = async (uid: string) => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id, status,
        sender:profiles!friendships_sender_id_fkey(id, username, avatar_url),
        receiver:profiles!friendships_receiver_id_fkey(id, username, avatar_url)
      `)
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

    if (error) return;

    const loadedFriends: any[] = [];
    const loadedRequests: any[] = [];

    data?.forEach((row: any) => {
      if (row.status === 'pending' && row.receiver?.id === uid) {
        loadedRequests.push({ friendshipId: row.id, sender: row.sender });
      } else if (row.status === 'accepted') {
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
      if (!session) return navigate('/');

      const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
      if (data) {
        setUsername(data.username);
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      }
      setUserId(session.user.id);
      loadSocialData(session.user.id);
    };
    checkSession();
  }, [navigate]);

  // Motor de Presencia (Quién está online)
  useEffect(() => {
    if (!userId) return;
    const presenceChannel = supabase.channel('platinum_presence', { config: { presence: { key: userId } } });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        setOnlineUsers(Object.keys(presenceChannel.presenceState()));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ online_at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [userId]);

  // Motor de Actualización de Perfiles
  useEffect(() => {
    if (!userId) return;
    const profilesChannel = supabase.channel('public:profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => loadSocialData(userId))
      .subscribe();
    return () => { supabase.removeChannel(profilesChannel); };
  }, [userId]);

  // --- NUEVO: RELOJ DEL TEMPORIZADOR ---
  useEffect(() => {
    let interval: any;
    if (outgoingChallenge) {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [outgoingChallenge]);


  // --- EL SÚPER RADAR MULTIJUGADOR ---
  useEffect(() => {
    if (!userId) return;

    // Ahora escuchamos TODOS los eventos de la tabla (INSERT, UPDATE)
    const challengesChannel = supabase.channel('public:challenges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenges' },
        async (payload) => {
          const { eventType, new: newRecord } = payload;

          // 1. CUANDO SE CREA UN RETO
          if (eventType === 'INSERT' && newRecord.status === 'pending') {
            if (newRecord.challenged_id === userId) {
              // A: Alguien nos reta (Somos el desafiado)
              const { data: challengerData } = await supabase.from('profiles').select('username, avatar_url').eq('id', newRecord.challenger_id).single();
              setIncomingChallenge({
                id: newRecord.id,
                format: newRecord.format,
                challengerName: challengerData?.username || 'Un entrenador',
                challengerAvatar: challengerData?.avatar_url
              });
            } else if (newRecord.challenger_id === userId) {
              // B: Nosotros enviamos el reto (Aparece el Timer)
              const { data: challengedData } = await supabase.from('profiles').select('username').eq('id', newRecord.challenged_id).single();
              setOutgoingChallenge({
                id: newRecord.id,
                format: newRecord.format,
                targetName: challengedData?.username || 'Tu oponente'
              });
            }
          }

          // 2. CUANDO EL ESTADO DEL RETO CAMBIA (Aceptar, Rechazar, Anular)
          if (eventType === 'UPDATE') {
            if (newRecord.status === 'accepted') {
              if (newRecord.challenger_id === userId) {
                // Nuestro amigo nos aceptó la pelea
                setOutgoingChallenge(null);
                alert(`¡${outgoingChallenge?.targetName || 'Tu oponente'} ha aceptado el reto! (Preparando la arena...)`);
                
                // ¡LA LÍNEA MÁGICA QUE FALTABA!
                navigate(`/battle/${newRecord.id}`); 
              }
            } else if (newRecord.status === 'declined') {
              if (newRecord.challenger_id === userId) {
                // Nuestro amigo nos rechazó
                setOutgoingChallenge(null);
                alert(`Tu oponente ha rechazado el desafío.`);
              }
            } else if (newRecord.status === 'canceled') {
              if (newRecord.challenged_id === userId) {
                // Nuestro amigo anuló el reto mientras lo pensábamos
                setIncomingChallenge(null);
                setIsAcceptModalOpen(false); // Cierra el modal de selección de equipo si estaba abierto
                alert(`El retador ha anulado el desafío.`);
              }
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(challengesChannel); };
  }, [userId, outgoingChallenge?.targetName]);

  // --- FUNCIONES DE CONTROL DE RETOS ---
  const handleDeclineChallenge = async (challengeId: string) => {
    await supabase.from('challenges').update({ status: 'declined' }).eq('id', challengeId);
    setIncomingChallenge(null);
  };

  const handleCancelOutgoingChallenge = async () => {
    if (!outgoingChallenge) return;
    await supabase.from('challenges').update({ status: 'canceled' }).eq('id', outgoingChallenge.id);
    setOutgoingChallenge(null);
  };

  const startAcceptChallenge = () => {
    setIsAcceptModalOpen(true); 
  };

  const confirmAcceptChallenge = async (selectedTeamId: string) => {
    if (!incomingChallenge || !userId) return;
    try {
      const { teams } = useTeamStore.getState();
      const chosenTeam = teams.find(t => t.id === selectedTeamId);
      if (!chosenTeam) throw new Error("Equipo no encontrado");

      const { error } = await supabase
        .from('challenges')
        .update({ status: 'accepted', challenged_team: chosenTeam.members })
        .eq('id', incomingChallenge.id);

      if (error) throw error;
      setIncomingChallenge(null);
      setIsAcceptModalOpen(false);
      navigate(`/battle/${incomingChallenge.id}`);
      alert(`¡Duelo aceptado con el equipo: ${chosenTeam.name}! (Redirigiendo a la Arena en el siguiente paso)`);
    } catch (error) {
      console.error("Error al aceptar el duelo:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/'); 
  };

  const navItems = [
    { name: 'Lobby', path: '/dashboard', icon: <Home size={20} /> },
    { name: 'Team Builder', path: '/teambuilder', icon: <Swords size={20} /> },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-900/80 backdrop-blur-xl border-r border-gray-800/50">
      <div className="p-6 border-b border-gray-800/50">
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-4 w-full text-left hover:bg-gray-800/30 p-2 rounded-2xl transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 p-[2px] shrink-0">
            <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center overflow-hidden">
                <img src={avatarUrl} alt="Avatar" className="w-10 h-10 object-contain" />
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

      <div className="p-4 flex-1 flex flex-col min-h-0">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Menú</h4>
        <nav className="space-y-2 shrink-0">
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

        <div className="mt-8 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between text-gray-500 mb-4 px-2 shrink-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider">Amigos</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => { setIsMobileMenuOpen(false); setIsRequestsModalOpen(true); }}
                className="relative p-1 hover:text-pink-400 hover:bg-pink-500/10 rounded-md transition-colors"
                title="Buzón de Solicitudes"
              >
                <Bell size={16} />
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
          
          <div className="space-y-2 overflow-y-auto pr-2 pb-4 flex-1 custom-scrollbar">
            {friends.length === 0 ? (
              <p className="text-xs italic text-gray-600 px-2">Aún no hay amigos agregados.</p>
            ) : (
              friends.map((friend) => {
                const isOnline = onlineUsers.includes(friend.profile.id);
                return (
                  <div key={friend.friendshipId} className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative shrink-0">
                        <img src={friend.profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full bg-gray-800 p-0.5 object-contain border border-gray-700" />
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-gray-900 rounded-full transition-colors duration-300 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">{friend.profile.username}</span>
                        <span className="text-[10px] text-gray-500 leading-none mt-0.5">
                          {isOnline ? 'Conectado' : 'Desconectado'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setChallengeTargetId(friend.profile.id);
                        setChallengeTargetName(friend.profile.username);
                        setIsChallengeModalOpen(true);
                        setIsMobileMenuOpen(false); 
                      }}
                      className="p-1.5 bg-gray-900 hover:bg-pink-600 hover:text-white text-pink-500 border border-gray-700 hover:border-pink-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Desafiar a un combate"
                    >
                      <Swords size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800/50 shrink-0">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-white selection:bg-pink-500 selection:text-white">
      
      {/* 1. NOTIFICACIÓN CUANDO TE RETAN (Rosa) */}
      <AnimatePresence>
        {incomingChallenge && (
          <motion.div
            initial={{ y: -100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -100, opacity: 0, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] w-[90%] max-w-sm bg-gray-950 border border-pink-500/50 shadow-2xl shadow-pink-500/20 rounded-2xl p-4 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-pink-500 animate-ping rounded-full opacity-20"></div>
                <img src={incomingChallenge.challengerAvatar} alt="..." className="relative w-12 h-12 rounded-full border-2 border-pink-500 object-contain bg-gray-800" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-1">
                  <Swords size={14} className="text-pink-500" /> ¡Desafío Entrante!
                </h3>
                <p className="text-gray-400 text-xs mt-1 leading-tight">
                  <span className="text-gray-200 font-bold">{incomingChallenge.challengerName}</span> te ha retado formato <span className="text-pink-400 font-bold">{getFormatName(incomingChallenge.format)}</span>.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleDeclineChallenge(incomingChallenge.id)} 
                className="flex-1 py-2 bg-gray-900 border border-gray-800 hover:bg-red-500/10 hover:border-red-500/50 text-red-400 rounded-xl text-xs font-bold transition-colors"
              >
                Rechazar
              </button>
              <button 
                onClick={() => startAcceptChallenge()} 
                className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all"
              >
                ¡Aceptar Reto!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. NOTIFICACIÓN CUANDO TÚ RETAS (Azul con Timer) */}
      <AnimatePresence>
        {outgoingChallenge && (
          <motion.div
            initial={{ y: -100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -100, opacity: 0, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] w-[90%] max-w-sm bg-gray-950 border border-blue-500/50 shadow-2xl shadow-blue-500/20 rounded-2xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Swords size={16} className="text-blue-500 animate-pulse" /> Esperando oponente...
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  Desafiaste a <span className="text-white font-bold">{outgoingChallenge.targetName}</span>
                </p>
              </div>
              <div className="text-2xl font-mono font-bold text-blue-400">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <button 
              onClick={handleCancelOutgoingChallenge} 
              className="w-full py-2 bg-gray-900 border border-gray-800 hover:bg-red-500/10 hover:border-red-500/50 text-red-400 rounded-xl text-xs font-bold transition-colors"
            >
              Anular Desafío
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Componentes Ocultos y Modales */}
      <FriendSearchModal isOpen={isFriendModalOpen} onClose={() => setIsFriendModalOpen(false)} currentUserId={userId} />
      <FriendRequestsModal isOpen={isRequestsModalOpen} onClose={() => setIsRequestsModalOpen(false)} requests={pendingRequests} onUpdate={() => userId && loadSocialData(userId)} />
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={userId}
        onUpdate={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
            if (data) {
              setUsername(data.username);
              setAvatarUrl(data.avatar_url);
            }
          }
        }}
      />  
      
      <ChallengeModal 
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        friendId={challengeTargetId}
        friendName={challengeTargetName}
      />

      <AcceptChallengeModal 
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        incomingChallenge={incomingChallenge}
        onConfirm={confirmAcceptChallenge}
      />

      {/* Contenedores visuales (Barra lateral y Fondo) */}
      <div className="hidden md:block w-72 h-full z-20">
        <SidebarContent />
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="md:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-2xl">
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 z-30">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
            Proyecto Platinum
          </h2>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
            <Menu size={24} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-purple-600/10 blur-[128px] rounded-full pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}