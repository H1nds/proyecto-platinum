import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, Send, MessageSquare, Swords } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { motion } from 'framer-motion';
import { RealtimeChannel } from '@supabase/supabase-js';

import { startShowdownEngine } from '../utils/engine';
import { Battle } from '@pkmn/sim';

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  isSystem: boolean;
}

export default function BattleArena() {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  
  const [battleChannel, setBattleChannel] = useState<RealtimeChannel | null>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [isSending, setIsSending] = useState(false); 
  
  const [myTeam, setMyTeam] = useState<any[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<any[]>([]);
  const [opponentName, setOpponentName] = useState('Oponente');
  
  const [isHost, setIsHost] = useState(false);
  const [battleEngine, setBattleEngine] = useState<Battle | null>(null);

  const [activeMyPoke, setActiveMyPoke] = useState<any>(null);
  const [activeOppPoke, setActiveOppPoke] = useState<any>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const lastLogIndex = useRef<number>(0);

  // --- NUEVOS ESTADOS DE COMBATE ---
  const [myHpString, setMyHpString] = useState('100/100');
  const [oppHpString, setOppHpString] = useState('100/100');
  const [waitingForTurn, setWaitingForTurn] = useState(false); // Candado para no hacer spam de ataques

  // Transformamos el texto de vida ("40/100") en un porcentaje real para la barra verde
  const getHpPercent = (hp: string) => {
    if (!hp) return 100;
    if (hp.includes('fnt')) return 0; // "fnt" significa Fainted (Debilitado)
    const cleanHp = hp.split(' ')[0]; 
    const parts = cleanHp.split('/');
    if (parts.length === 2) {
       const current = parseInt(parts[0]);
       const max = parseInt(parts[1]);
       if (max === 0) return 0;
       return Math.max(0, Math.min(100, (current / max) * 100));
    }
    const parsed = parseInt(cleanHp);
    if (!isNaN(parsed)) return parsed;
    return 100;
  };

  // --- TRADUCTOR DE PROTOCOLOS ---
  const processBattleProtocol = (logText: string) => {
    if (!logText) return;
    const lines = logText.split('\n');
    
    lines.forEach(line => {
      const parts = line.split('|');
      if (parts.length < 2) return;

      const command = parts[1];

      if (command === 'start') {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: '¡El combate ha comenzado!', isSystem: true }]);
      } 
      else if (command === 'switch') {
        const pokeIdentity = parts[2]; // ej: p1a: Charizard
        const pokeName = pokeIdentity.split(': ')[1] || pokeIdentity;
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡Adelante, ${pokeName}!`, isSystem: true }]);
      }
      else if (command === 'turn') {
        setWaitingForTurn(false); // ¡Terminó el turno! Desbloqueamos los botones
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `--- Turno ${parts[2]} ---`, isSystem: true }]);
      }
      else if (command === 'move') {
        const attackerIdentity = parts[2];
        const attackerName = attackerIdentity.split(': ')[1] || attackerIdentity;
        const moveName = parts[3];
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡${attackerName} usó ${moveName}!`, isSystem: true }]);
      }
      else if (command === '-damage' || command === '-heal') {
        const victimIdentity = parts[2];
        const victimName = victimIdentity.split(': ')[1] || victimIdentity;
        const hpString = parts[3].split(' ')[0]; // "40/100"
        
        // Identificamos de quién es el Pokémon para bajar la barra correcta
        // isHost = true (Yo soy p1, rival p2). isHost = false (Yo soy p2, rival p1)
        const isMyPoke = isHost ? victimIdentity.startsWith('p1') : victimIdentity.startsWith('p2');
        
        if (isMyPoke) setMyHpString(hpString);
        else setOppHpString(hpString);

        const actionText = command === '-heal' ? 'recuperó salud' : 'recibió daño';
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡${victimName} ${actionText}! (HP: ${hpString})`, isSystem: true }]);
      }
      else if (command === 'faint') {
        const victimIdentity = parts[2];
        const victimName = victimIdentity.split(': ')[1] || victimIdentity;
        
        const isMyPoke = isHost ? victimIdentity.startsWith('p1') : victimIdentity.startsWith('p2');
        if (isMyPoke) setMyHpString('0/100 fnt');
        else setOppHpString('0/100 fnt');

        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡${victimName} se ha debilitado!`, isSystem: true }]);
      }
    });
  };

  const flushLogs = (engine: Battle, currentChannel: RealtimeChannel | null) => {
    if (!engine) return;
    if (engine.log.length > lastLogIndex.current) {
      const newLogs = engine.log.slice(lastLogIndex.current).join('\n');
      lastLogIndex.current = engine.log.length;
      
      processBattleProtocol(newLogs);
      
      if (currentChannel) {
        currentChannel.send({
          type: 'broadcast',
          event: 'battle_protocol',
          payload: { log: newLogs }
        }).catch(e => console.error(e));
      }
    }
  };

  useEffect(() => {
    const initArena = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/');
      
      const currentUserId = session.user.id;
      setUserId(currentUserId);
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', currentUserId).single();
      if (profile) setUsername(profile.username);

      const { data: battleData } = await supabase.from('challenges').select('*').eq('id', battleId).single();
      
      if (battleData && profile) {
        const amIChallenger = battleData.challenger_id === currentUserId;
        setIsHost(amIChallenger);
        
        const team1 = battleData.challenger_team || [];
        const team2 = battleData.challenged_team || [];

        setMyTeam(amIChallenger ? team1 : team2);
        setOpponentTeam(amIChallenger ? team2 : team1);
        
        if ((amIChallenger ? team1 : team2).length > 0) setActiveMyPoke((amIChallenger ? team1 : team2)[0]);
        if ((amIChallenger ? team2 : team1).length > 0) setActiveOppPoke((amIChallenger ? team2 : team1)[0]);

        const rivalId = amIChallenger ? battleData.challenged_id : battleData.challenger_id;
        const { data: rivalProfile } = await supabase.from('profiles').select('username').eq('id', rivalId).single();
        if (rivalProfile) setOpponentName(rivalProfile.username);

        if (amIChallenger && rivalProfile) {
          const battle = startShowdownEngine(battleData.format, profile.username, team1, rivalProfile.username, team2);
          setBattleEngine(battle);
        }
      }

      setMessages([{ id: 'sys-1', senderName: 'Árbitro', text: 'Sincronizando túnel seguro...', isSystem: true }]);
    };
    initArena();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, battleId]);

  useEffect(() => {
    if (!userId || !battleId) return;

    const channel = supabase.channel(`battle-${battleId}`, {
      config: { broadcast: { ack: true } }
    });

    channel
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        const incomingMsg = payload.payload as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });
      })
      .on('broadcast', { event: 'battle_protocol' }, (payload) => {
        if (!isHost) {
          processBattleProtocol(payload.payload.log);
        }
      })
      .on('broadcast', { event: 'client_action' }, (payload) => {
        if (isHost && battleEngine) {
          const clientMoveNumber = payload.payload.moveIndex + 1;
          try {
             const success = battleEngine.choose('p2', `move ${clientMoveNumber}`);
             if (!success) console.log("Ataque del cliente rechazado. (El Pokémon podría estar debilitado o esperando otra orden)");
             flushLogs(battleEngine, channel); 
          } catch(e) {
             console.error("Error al inyectar ataque del Cliente", e);
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
           setIsChannelReady(true);
           setMessages(prev => [...prev, {
             id: crypto.randomUUID(), senderName: 'Sistema', text: 'Conexión segura establecida.', isSystem: true
           }]);

           if (isHost && battleEngine) {
             // Solo mandamos el registro inicial limpio. Sin mensajes dobles.
             flushLogs(battleEngine, channel); 
           }
        }
      });

    setBattleChannel(channel);

    return () => { 
      supabase.removeChannel(channel); 
      setIsChannelReady(false);
    };
  }, [userId, battleId, isHost, battleEngine]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !battleChannel || !isChannelReady || isSending) return;

    setIsSending(true);

    const newMessage: ChatMessage = { id: crypto.randomUUID(), senderName: username, text: chatInput.trim(), isSystem: false };

    setMessages(prev => [...prev, newMessage]);
    setChatInput('');

    try { await battleChannel.send({ type: 'broadcast', event: 'chat_message', payload: newMessage }); } 
    catch (err) { console.error("Error:", err); } 
    finally { setTimeout(() => { setIsSending(false); }, 500); }
  };

  const handleAttack = async (moveIndex: number) => {
    setWaitingForTurn(true); // Bloqueamos los botones instantáneamente

    if (isHost && battleEngine) {
      const showdownMoveNumber = moveIndex + 1;
      try {
         const success = battleEngine.choose('p1', `move ${showdownMoveNumber}`);
         if (success) {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Sistema', text: 'Esperando orden del rival...', isSystem: true }]);
         } else {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Sistema', text: 'Turno inválido. El motor rechazó el ataque.', isSystem: true }]);
            setWaitingForTurn(false);
         }
         flushLogs(battleEngine, battleChannel);
      } catch (e) {
         console.error("Error al atacar:", e);
         setWaitingForTurn(false);
      }
    } else {
       if (!battleChannel) return;
       try {
         await battleChannel.send({
           type: 'broadcast',
           event: 'client_action',
           payload: { moveIndex: moveIndex }
         });
         setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Sistema', text: 'Orden enviada. Esperando al rival...', isSystem: true }]);
       } catch (e) {
         console.error("Error al enviar el ataque:", e);
         setWaitingForTurn(false);
       }
    }
  };

  const getSpriteUrl = (pokemonName: string, isBack: boolean) => {
    if (!pokemonName) return 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif';
    const cleanName = pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://play.pokemonshowdown.com/sprites/ani${isBack ? '-back' : ''}/${cleanName}.gif`;
  };

  // Porcentajes de vida para el CSS
  const myWidth = `${getHpPercent(myHpString)}%`;
  const oppWidth = `${getHpPercent(oppHpString)}%`;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-950 text-white overflow-hidden selection:bg-pink-500">
      
      {/* SECCIÓN IZQUIERDA (Arena) */}
      <div className="flex-1 flex flex-col relative h-[60vh] lg:h-screen">
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
          <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 flex items-center gap-2">
            <Swords size={20} className="text-pink-500" />
            Arena de Batalla {isHost && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 ml-2">HOST</span>}
          </h1>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-xl transition-all font-bold text-sm">
            <LogOut size={16} /> Rendirse
          </button>
        </div>

        <div className="flex-1 relative bg-[url('https://play.pokemonshowdown.com/sprites/bg/bg-meadow.png')] bg-cover bg-center bg-no-repeat shadow-inner">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
          
          {/* OPONENTE */}
          <div className="absolute top-[15%] right-[10%] lg:right-[20%] w-48 text-right">
            <div className="bg-gray-900/80 p-2 rounded-xl border border-gray-700 shadow-xl mb-2 backdrop-blur-md">
              <div className="flex justify-between items-center text-sm font-bold mb-1">
                <span className="capitalize">{activeOppPoke?.name || '???'}</span>
                <span className="text-green-400">{getHpPercent(oppHpString).toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                 {/* BARRA VIVA */}
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: oppWidth }}></div>
              </div>
            </div>
            <img src={getSpriteUrl(activeOppPoke?.name, false)} alt="Oponente" className="inline-block w-24 h-24 object-contain drop-shadow-2xl opacity-90" />
          </div>

          {/* JUGADOR */}
          <div className="absolute bottom-[5%] left-[5%] lg:left-[15%] w-56">
            <img src={getSpriteUrl(activeMyPoke?.name, true)} alt="Jugador" className="block w-32 h-32 object-contain drop-shadow-2xl opacity-100 mb-2" />
            <div className="bg-gray-900/90 p-3 rounded-xl border border-pink-500/30 shadow-xl shadow-pink-500/10 backdrop-blur-md">
              <div className="flex justify-between items-center text-sm font-bold mb-1">
                <span className="text-pink-400 capitalize">{activeMyPoke?.name || '???'}</span>
                <span className="text-green-400">{myHpString}</span>
              </div>
              <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden">
                 {/* BARRA VIVA */}
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: myWidth }}></div>
              </div>
              <div className="mt-1 flex gap-1">
                {myTeam.map((_, i) => <div key={i} className="w-3 h-3 rounded-full bg-pink-500/50 border border-pink-500" />)}
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DE ATAQUES */}
        <div className="h-48 lg:h-64 bg-gray-950 border-t border-gray-800 p-4 shrink-0 flex flex-col">
          <p className="text-center text-gray-500 font-medium mb-4">¿Qué hará {activeMyPoke?.name}?</p>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {activeMyPoke?.moves?.slice(0,4).map((move: string, index: number) => (
              <button 
                key={index} 
                onClick={() => handleAttack(index)}
                disabled={waitingForTurn} // Candado activado
                className={`bg-gray-900 border border-gray-700 rounded-xl p-3 flex flex-col items-start justify-center transition-all cursor-pointer ${waitingForTurn ? 'opacity-50 cursor-not-allowed' : 'hover:border-pink-500 hover:bg-gray-800'}`}
              >
                <span className="font-bold text-white text-lg capitalize">{move || 'Vacío'}</span>
                {move && <span className="text-xs font-bold text-pink-500 uppercase">Usar Ataque</span>}
              </button>
            ))}
            {!activeMyPoke?.moves && <button className="bg-gray-800 border border-gray-700 rounded-xl p-3">Vacío</button>}
          </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA (Chat) */}
      <div className="w-full lg:w-96 h-[40vh] lg:h-screen bg-gray-900 border-l border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <MessageSquare size={18} className="text-pink-500" />
             <h2 className="font-bold text-white">Registro</h2>
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase px-2 py-1 bg-gray-900 rounded-md">vs {opponentName}</span>
        </div>

        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {messages.map(msg => (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={msg.id} className={`p-3 rounded-xl text-sm ${msg.isSystem ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100 font-medium' : msg.senderName === username ? 'bg-pink-600/20 border border-pink-500/30 text-white ml-8' : 'bg-gray-800 border border-gray-700 text-gray-200 mr-8'}`}>
              {!msg.isSystem && <span className="block text-[10px] font-bold uppercase text-gray-500 mb-1">{msg.senderName}</span>}
              {msg.text}
            </motion.div>
          ))}
        </div>

        <form onSubmit={sendChatMessage} className="p-4 border-t border-gray-800 bg-gray-950/50 flex gap-2 shrink-0 relative">
          <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={isChannelReady ? (isSending ? "Enviando..." : "Escribe un mensaje...") : "Conectando..."} disabled={!isChannelReady || isSending} className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" />
          <button type="submit" disabled={!chatInput.trim() || !isChannelReady || isSending} className="p-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl transition-all disabled:cursor-not-allowed">
            <Send size={18} />
          </button>
        </form>
      </div>

    </div>
  );
}