// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, Send, MessageSquare, Swords, Sparkles, Home } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { RealtimeChannel } from '@supabase/supabase-js';

import { startShowdownEngine } from '../utils/engine';
import { Battle } from '@pkmn/sim';

interface ChatMessage { id: string; senderName: string; text: string; isSystem: boolean; }
interface TeamStatus { hp: string; fainted: boolean; }

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
  const engineRef = useRef<Battle | null>(null);

  const [activeMyPoke, setActiveMyPoke] = useState<any>(null);
  const [activeOppPoke, setActiveOppPoke] = useState<any>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastLogIndex = useRef<number>(0);

  const [showVsScreen, setShowVsScreen] = useState(true); 
  const [battleEnded, setBattleEnded] = useState(false);  
  const [winner, setWinner] = useState<string | null>(null);

  const [teraAvailable, setTeraAvailable] = useState(true); 
  const [teraActive, setTeraActive] = useState(false);

  const [myHpString, setMyHpString] = useState('100/100');
  const [oppHpString, setOppHpString] = useState('100/100');
  const [waitingForTurn, setWaitingForTurn] = useState(false);

  const [myAnim, setMyAnim] = useState('idle');
  const [oppAnim, setOppAnim] = useState('idle');

  const [myTeamStatus, setMyTeamStatus] = useState<Record<string, TeamStatus>>({});

  const playSound = (url: string) => {
    try { const audio = new Audio(url); audio.volume = 0.5; audio.play().catch(()=>{}); } catch(e) {}
  };

  const getHpPercent = (hp: string) => {
    if (!hp) return 100;
    if (hp.includes('fnt')) return 0; 
    const cleanHp = hp.split(' ')[0]; 
    const parts = cleanHp.split('/');
    if (parts.length === 2) {
       const max = parseInt(parts[1]);
       return max === 0 ? 0 : Math.max(0, Math.min(100, (parseInt(parts[0]) / max) * 100));
    }
    return isNaN(parseInt(cleanHp)) ? 100 : parseInt(cleanHp);
  };

  const processBattleProtocol = (logText: string, currentIsHost: boolean, currentMyTeam: any[], currentOppTeam: any[]) => {
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
        const pokeIdentity = parts[2]; 
        const hp = parts[4];
        const pokeName = pokeIdentity.split(': ')[1] || pokeIdentity;
        const isMyPoke = currentIsHost ? pokeIdentity.startsWith('p1') : pokeIdentity.startsWith('p2');
        
        if(pokeName) playSound(`https://play.pokemonshowdown.com/audio/cries/${String(pokeName).toLowerCase().replace(/[^a-z0-9]/g, '')}.mp3`);

        if (isMyPoke) {
           const realPoke = currentMyTeam.find(p => p.name === pokeName) || currentMyTeam[0];
           setActiveMyPoke(realPoke);
           setMyHpString(hp);
           setMyAnim('idle');
           setMyTeamStatus(prev => ({...prev, [pokeName]: { hp, fainted: false }}));
        } else {
           const realPoke = currentOppTeam.find(p => p.name === pokeName) || currentOppTeam[0];
           setActiveOppPoke(realPoke);
           setOppHpString(hp);
           setOppAnim('idle');
        }
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡Adelante, ${pokeName}!`, isSystem: true }]);
      }
      else if (command === 'turn') {
        setWaitingForTurn(false); 
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `--- Turno ${parts[2]} ---`, isSystem: true }]);
      }
      else if (command === 'move') {
        const attackerIdentity = parts[2];
        const moveName = parts[3];
        const attackerName = attackerIdentity.split(': ')[1] || attackerIdentity;
        const isMyPoke = currentIsHost ? attackerIdentity.startsWith('p1') : attackerIdentity.startsWith('p2');
        
        playSound('https://play.pokemonshowdown.com/audio/sfx/tackle.mp3');
        if (isMyPoke) { setMyAnim('attack'); setTimeout(() => setMyAnim('idle'), 500); }
        else { setOppAnim('attack'); setTimeout(() => setOppAnim('idle'), 500); }

        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡${attackerName} usó ${moveName}!`, isSystem: true }]);
      }
      else if (command === '-damage' || command === '-heal') {
        const victimIdentity = parts[2];
        const hpString = parts[3].split(' ')[0]; 
        const victimName = victimIdentity.split(': ')[1] || victimIdentity;
        const isMyPoke = currentIsHost ? victimIdentity.startsWith('p1') : victimIdentity.startsWith('p2');
        
        if (command === '-damage') playSound('https://play.pokemonshowdown.com/audio/sfx/normalhit.mp3');

        if (isMyPoke) {
           setMyHpString(hpString);
           setMyTeamStatus(prev => ({...prev, [victimName]: { hp: hpString, fainted: false }}));
           if (command === '-damage') { setMyAnim('hit'); setTimeout(() => setMyAnim('idle'), 500); }
        } else {
           setOppHpString(hpString);
           if (command === '-damage') { setOppAnim('hit'); setTimeout(() => setOppAnim('idle'), 500); }
        }
      }
      else if (command === 'faint') {
        const victimIdentity = parts[2];
        const victimName = victimIdentity.split(': ')[1] || victimIdentity;
        const isMyPoke = currentIsHost ? victimIdentity.startsWith('p1') : victimIdentity.startsWith('p2');
        
        playSound('https://play.pokemonshowdown.com/audio/sfx/faint.mp3');

        if (isMyPoke) {
           setMyHpString('0/100 fnt');
           setMyTeamStatus(prev => ({...prev, [victimName]: { hp: '0', fainted: true }}));
           setMyAnim('faint');
           setWaitingForTurn(false); 
        } else {
           setOppHpString('0/100 fnt');
           setOppAnim('faint');
        }
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡${victimName} se ha debilitado!`, isSystem: true }]);
      }
      else if (command === 'cant') { setWaitingForTurn(false); }
      else if (command === '-supereffective') { playSound('https://play.pokemonshowdown.com/audio/sfx/super-effective.mp3'); }
      else if (command === '-resisted') { playSound('https://play.pokemonshowdown.com/audio/sfx/not-very-effective.mp3'); }
      else if (command === 'win') {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡El combate ha terminado! Ganador: ${parts[2]}`, isSystem: true }]);
        setWinner(parts[2]);
        setBattleEnded(true);
      }
    });
  };

  const flushLogs = (engine: Battle, currentChannel: RealtimeChannel | null, currentIsHost: boolean, currentMyTeam: any[], currentOppTeam: any[]) => {
    if (!engine) return;
    if (engine.log.length > lastLogIndex.current) {
      const newLogs = engine.log.slice(lastLogIndex.current).join('\n');
      lastLogIndex.current = engine.log.length;
      processBattleProtocol(newLogs, currentIsHost, currentMyTeam, currentOppTeam);
      if (currentChannel) {
        currentChannel.send({ type: 'broadcast', event: 'battle_protocol', payload: { log: newLogs } }).catch(()=>{});
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

        const rivalId = amIChallenger ? battleData.challenged_id : battleData.challenger_id;
        const { data: rivalProfile } = await supabase.from('profiles').select('username').eq('id', rivalId).single();
        if (rivalProfile) {
            setOpponentName(rivalProfile.username);
            setTimeout(() => setShowVsScreen(false), 3500); 
        }

        if (amIChallenger && rivalProfile && !engineRef.current) {
          engineRef.current = startShowdownEngine(battleData.format, profile.username, team1, rivalProfile.username, team2);
        }
      }
      setMessages([{ id: 'sys-1', senderName: 'Árbitro', text: 'Sincronizando túnel seguro...', isSystem: true }]);
    };
    initArena();
  }, [navigate, battleId]);

  useEffect(() => {
    if (!userId || !battleId) return;

    const channelName = `battle-${battleId}`;
    supabase.removeChannel(supabase.channel(channelName));
    const channel = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

    channel
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.payload.id)) return prev;
          return [...prev, payload.payload];
        });
      })
      .on('broadcast', { event: 'battle_protocol' }, (payload) => {
        if (!isHost) processBattleProtocol(payload.payload.log, isHost, myTeam, opponentTeam);
      })
      .on('broadcast', { event: 'forfeit' }, (payload) => {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Árbitro', text: `¡${payload.payload.name} se ha rendido!`, isSystem: true }]);
        setWinner(payload.payload.name === opponentName ? username : opponentName);
        setBattleEnded(true);
      })
      .on('broadcast', { event: 'action_rejected' }, () => {
        if (!isHost) {
           setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Sistema', text: 'Acción rechazada.', isSystem: true }]);
           setWaitingForTurn(false); 
        }
      })
      .on('broadcast', { event: 'client_action' }, (payload) => {
        if (isHost && engineRef.current) {
          const { action, value, tera } = payload.payload;
          let command = `${action} ${value}`;
          if (tera) command += ' terastallize';

          try {
             const success = engineRef.current.choose('p2', command);
             if (!success) channel.send({ type: 'broadcast', event: 'action_rejected' }).catch(()=>{});
             flushLogs(engineRef.current, channel, isHost, myTeam, opponentTeam); 
          } catch(e) {}
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
           setIsChannelReady(true);
           if (isHost && engineRef.current) flushLogs(engineRef.current, channel, isHost, myTeam, opponentTeam); 
        }
      });

    setBattleChannel(channel);
    return () => { supabase.removeChannel(channel); setIsChannelReady(false); };
  }, [userId, battleId, isHost, myTeam, opponentTeam, username, opponentName]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !battleChannel || !isChannelReady || isSending) return;
    setIsSending(true);
    const newMessage: ChatMessage = { id: crypto.randomUUID(), senderName: username, text: chatInput.trim(), isSystem: false };
    setMessages(prev => [...prev, newMessage]);
    setChatInput('');
    try { await battleChannel.send({ type: 'broadcast', event: 'chat_message', payload: newMessage }); } 
    catch (err) {} finally { setTimeout(() => setIsSending(false), 500); }
  };

  const handleForfeit = () => {
    if (battleChannel) battleChannel.send({ type: 'broadcast', event: 'forfeit', payload: { name: username } });
    setWinner(opponentName);
    setBattleEnded(true);
  };

  const handleAction = async (actionType: 'move' | 'switch', index: number) => {
    if (waitingForTurn) return; 
    setWaitingForTurn(true);

    const showdownValue = index + 1; 
    let command = `${actionType} ${showdownValue}`;
    
    if (actionType === 'move' && teraActive && teraAvailable) {
       command += ' terastallize';
       setTeraAvailable(false);
       setTeraActive(false);
    }

    if (isHost && engineRef.current) {
      try {
         const success = engineRef.current.choose('p1', command);
         if (success) {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Sistema', text: 'Esperando orden del rival...', isSystem: true }]);
         } else {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Sistema', text: 'Acción rechazada.', isSystem: true }]);
            setWaitingForTurn(false); 
         }
         flushLogs(engineRef.current, battleChannel, isHost, myTeam, opponentTeam);
      } catch (e) { setWaitingForTurn(false); }
    } else {
       if (!battleChannel) return;
       try {
         await battleChannel.send({
           type: 'broadcast',
           event: 'client_action',
           payload: { action: actionType, value: showdownValue, tera: actionType === 'move' && teraActive && teraAvailable }
         });
         if (actionType === 'move' && teraActive) { setTeraAvailable(false); setTeraActive(false); }
         setMessages(prev => [...prev, { id: crypto.randomUUID(), senderName: 'Sistema', text: 'Orden enviada. Esperando al rival...', isSystem: true }]);
       } catch (e) { setWaitingForTurn(false); }
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src.includes('/ani')) target.src = target.src.replace('/ani', '/gen5').replace('.gif', '.png');
    else if (!target.src.includes('substitute')) target.src = 'https://play.pokemonshowdown.com/sprites/substitute.png';
  };

  const getSpriteUrl = (pokemonName: string | undefined, isBack: boolean) => {
    if (!pokemonName) return 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif';
    return `https://play.pokemonshowdown.com/sprites/ani${isBack ? '-back' : ''}/${String(pokemonName).toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`;
  };

  const getAnimationProps = (animState: string, isPlayer: boolean) => {
    if (animState === 'attack') return { x: isPlayer ? [0, 50, 0] : [0, -50, 0], scale: [1, 1.1, 1] };
    if (animState === 'hit') return { x: [-10, 10, -10, 10, 0], filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'] };
    if (animState === 'faint') return { y: [0, 50], opacity: [1, 0] };
    return { x: 0, y: 0, opacity: 1, scale: 1 };
  };

  const myHpPercent = getHpPercent(myHpString);
  const oppHpPercent = getHpPercent(oppHpString);
  const myHpColor = myHpPercent > 50 ? 'bg-green-500' : myHpPercent > 20 ? 'bg-yellow-400' : 'bg-red-500';
  const oppHpColor = oppHpPercent > 50 ? 'bg-green-500' : oppHpPercent > 20 ? 'bg-yellow-400' : 'bg-red-500';

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-950 text-white overflow-hidden selection:bg-pink-500">
      
      <AnimatePresence>
        {showVsScreen && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="fixed inset-0 z-[100] bg-black flex overflow-hidden">
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 20 }} className="flex-1 bg-blue-700 border-r-8 border-yellow-400 flex items-center justify-center relative">
               <div className="absolute inset-0 opacity-20 bg-[url('https://play.pokemonshowdown.com/sprites/types/Dragon.png')] bg-repeat bg-center"></div>
               <h2 className="text-6xl font-black italic drop-shadow-xl z-10">{username}</h2>
            </motion.div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
               <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.5, type: 'spring' }} className="text-8xl font-black italic text-yellow-400 drop-shadow-[0_0_20px_rgba(0,0,0,1)]">VS</motion.div>
            </div>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 20 }} className="flex-1 bg-red-700 flex items-center justify-center relative">
               <div className="absolute inset-0 opacity-20 bg-[url('https://play.pokemonshowdown.com/sprites/types/Fire.png')] bg-repeat bg-center"></div>
               <h2 className="text-6xl font-black italic drop-shadow-xl z-10">{opponentName}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {battleEnded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-gray-900 border-2 border-gray-700 p-8 rounded-3xl text-center max-w-lg w-full shadow-2xl">
                <h2 className={`text-6xl font-black mb-2 ${winner === username ? 'text-yellow-400' : 'text-red-500'}`}>
                  {winner === username ? '¡VICTORIA!' : 'DERROTA'}
                </h2>
                <p className="text-gray-400 mb-8 text-lg">{winner === username ? 'Has dominado la arena.' : 'Tu equipo ha caído en combate.'}</p>
                <button onClick={() => navigate('/dashboard')} className="w-full py-4 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold text-xl flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(219,39,119,0.4)]">
                  <Home size={24} /> Volver al Lobby
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative h-[60vh] lg:h-screen">
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 flex items-center gap-2">
            <Swords size={20} className="text-pink-500" /> Arena de Batalla
          </h1>
          <button onClick={handleForfeit} disabled={battleEnded} className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-xl transition-all font-bold text-sm z-50">
            <LogOut size={16} /> Rendirse
          </button>
        </div>

        <div className="flex-1 relative shadow-inner overflow-hidden flex items-center justify-center bg-[url('https://play.pokemonshowdown.com/sprites/bg/bg-stadium.png')] bg-cover bg-center bg-[#4d7f50]">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
          
          <div className="absolute top-[20%] right-[10%] lg:right-[20%] w-56 text-right z-10">
            <div className="bg-gray-900/90 p-3 rounded-xl border border-gray-700 shadow-2xl mb-2 backdrop-blur-md">
              <div className="flex justify-between items-center text-sm font-bold mb-1">
                <span className="capitalize">{activeOppPoke?.name || '???'}</span>
                <span className="text-gray-300">{oppHpPercent.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${oppHpColor} transition-all duration-500`} style={{ width: `${oppHpPercent}%` }}></div>
              </div>
            </div>
            <motion.img animate={getAnimationProps(oppAnim, false)} transition={{ duration: 0.4 }} src={getSpriteUrl(activeOppPoke?.name, false)} onError={handleImageError} alt="Oponente" className="inline-block w-32 h-32 object-contain drop-shadow-2xl opacity-90" />
          </div>

          <div className="absolute bottom-[10%] left-[5%] lg:left-[15%] w-64 z-20">
            <motion.img animate={getAnimationProps(myAnim, true)} transition={{ duration: 0.4 }} src={getSpriteUrl(activeMyPoke?.name, true)} onError={handleImageError} alt="Jugador" className="block w-40 h-40 object-contain drop-shadow-2xl opacity-100 mb-2" />
            <div className="bg-gray-900/90 p-4 rounded-xl border border-pink-500/40 shadow-[0_0_30px_rgba(219,39,119,0.15)] backdrop-blur-md">
              <div className="flex justify-between items-center text-sm font-bold mb-2">
                <span className="text-pink-400 capitalize flex items-center gap-1">{activeMyPoke?.name || '???'} {teraActive && <Sparkles size={14} className="text-yellow-400 animate-pulse"/>}</span>
                <span className="text-gray-300">{myHpPercent.toFixed(0)}%</span>
              </div>
              <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${myHpColor} transition-all duration-500`} style={{ width: `${myHpPercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-56 lg:h-64 bg-gray-950 border-t border-gray-800 p-4 shrink-0 flex flex-col lg:flex-row gap-4 relative z-30">
           <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                 <p className="text-gray-400 font-medium">Ataques de {activeMyPoke?.name}:</p>
                 <button onClick={() => setTeraActive(!teraActive)} disabled={!teraAvailable || waitingForTurn || myHpString.includes('fnt')} className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg border transition-all ${teraActive ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : !teraAvailable ? 'bg-gray-800 border-gray-700 text-gray-600 opacity-50 cursor-not-allowed' : 'bg-gray-900 border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-400'}`}>
                    <Sparkles size={12} /> Teracristalizar
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1">
                {activeMyPoke?.moves?.slice(0,4).map((move: string, index: number) => (
                  <button key={index} onClick={() => handleAction('move', index)} disabled={waitingForTurn || myHpString.includes('fnt')} className={`bg-gray-900 border rounded-xl p-2 flex flex-col items-center justify-center transition-all ${waitingForTurn || myHpString.includes('fnt') ? 'border-gray-800 opacity-50 cursor-not-allowed' : teraActive ? 'border-yellow-400/50 hover:bg-yellow-400/10 hover:border-yellow-400 shadow-[inset_0_0_10px_rgba(250,204,21,0.1)]' : 'border-gray-700 hover:border-pink-500 hover:bg-gray-800'}`}>
                    <span className="font-bold text-white text-md capitalize">{move || 'Vacío'}</span>
                  </button>
                ))}
              </div>
           </div>

           <div className="flex-1 lg:border-l lg:border-gray-800 lg:pl-4 flex flex-col">
              <p className="text-gray-400 font-medium mb-2">Cambiar Pokémon:</p>
              <div className="grid grid-cols-3 gap-2 flex-1">
                {myTeam.filter(p => p && p.name).map((poke, index) => {
                  const status = myTeamStatus[poke.name] || { fainted: false, hp: '100/100' };
                  const isActive = poke.name === activeMyPoke?.name && !myHpString.includes('fnt');
                  const isDisabled = waitingForTurn || status.fainted || isActive;

                  return (
                    <button key={index} onClick={() => handleAction('switch', index)} disabled={isDisabled} className={`relative bg-gray-900 border rounded-xl p-1 flex flex-col items-center justify-center transition-all ${status.fainted ? 'border-red-900 opacity-40 cursor-not-allowed grayscale' : isActive ? 'border-pink-500 bg-pink-500/10 cursor-not-allowed' : isDisabled ? 'border-gray-800 opacity-50 cursor-not-allowed' : 'border-gray-700 hover:border-blue-400 hover:bg-blue-500/10'}`}>
                      {status.fainted && <span className="absolute top-1 right-1 text-[8px] font-black bg-red-600 text-white px-1 rounded z-10">FNT</span>}
                      <img src={`https://play.pokemonshowdown.com/sprites/gen5/${String(poke.name).toLowerCase().replace(/[^a-z0-9]/g, '')}.png`} onError={handleImageError} className="w-10 h-10 object-contain" />
                      <span className="font-bold text-[10px] truncate w-full text-center">{poke.name}</span>
                    </button>
                  );
                })}
              </div>
           </div>
        </div>
      </div>

      <div className="w-full lg:w-96 h-[40vh] lg:h-screen bg-gray-900 border-l border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2"><MessageSquare size={18} className="text-pink-500" /><h2 className="font-bold text-white">Registro</h2></div>
          <span className="text-xs font-bold text-gray-500 uppercase px-2 py-1 bg-gray-900 rounded-md">vs {opponentName}</span>
        </div>
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {messages.map(msg => (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={msg.id} className={`p-3 rounded-xl text-sm ${msg.isSystem ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100 font-medium' : msg.senderName === username ? 'bg-pink-600/20 border border-pink-500/30 text-white ml-8' : 'bg-gray-800 border border-gray-700 text-gray-200 mr-8'}`}>
              {!msg.isSystem && <span className="block text-[10px] font-bold uppercase text-gray-500 mb-1">{msg.senderName}</span>}{msg.text}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}