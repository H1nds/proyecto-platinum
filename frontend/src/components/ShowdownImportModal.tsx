import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { Team } from '@pkmn/sets';
import { Dex } from '@pkmn/dex';
import { useTeamStore } from '../store/useTeamStore';

interface ShowdownImportModalProps {
isOpen: boolean;
onClose: () => void;
teamId: string;
}

export default function ShowdownImportModal({ isOpen, onClose, teamId }: ShowdownImportModalProps) {
const [importText, setImportText] = useState('');
const [error, setError] = useState<string | null>(null);
const { importTeam } = useTeamStore();

const handleImport = () => {
 try {
   setError(null);
   
   // 1. La librería lee el texto de Showdown y lo convierte en objetos
   const parsedTeam = Team.fromString(importText);
   
   if (!parsedTeam || !parsedTeam.team || parsedTeam.team.length === 0) {
     throw new Error("No se pudo detectar un equipo válido en el texto.");
   }

   // 2. Mapeamos esos objetos a nuestro formato TeamMember
   const mappedMembers = parsedTeam.team.map(set => {
     // Buscamos al Pokémon en la base de datos de pkmn para sacar su número (ID)
     const species = Dex.species.get(set.species || set.name);
     const dexNum = species ? species.num : null;
     
     // Armamos la URL del sprite usando el número de la Pokédex
     const spriteUrl = dexNum ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNum}.png` : null;

     return {
       pokemonId: dexNum,
       name: set.species,
       sprite: spriteUrl,
       item: set.item || '',
       ability: set.ability || '',
       nature: set.nature || 'Serious',
       level: set.level || 50,
       // Showdown a veces omite EVs/IVs si están en 0 o 31, nos aseguramos de poner los valores por defecto
       evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
       ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...set.ivs },
       moves: [
         set.moves[0] || '',
         set.moves[1] || '',
         set.moves[2] || '',
         set.moves[3] || ''
       ]
     };
   });

   // 3. Enviamos los datos a nuestro Store Global (Zustand)
   importTeam(teamId, mappedMembers);
   
   // Limpiamos y cerramos
   setImportText('');
   onClose();

 } catch (err: any) {
   setError("Error al procesar el texto: " + err.message);
 }
};

if (!isOpen) return null;

return (
 <AnimatePresence>
   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
     <motion.div
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.95 }}
       className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl"
     >
       <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between">
         <h2 className="text-xl font-bold text-white flex items-center gap-2">
           <Download size={20} className="text-pink-500" />
           Importar de Showdown
         </h2>
         <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
           <X size={24} />
         </button>
       </div>

       <div className="p-4 flex-1">
         <p className="text-sm text-gray-400 mb-3">
           Pega aquí el texto exportado de Pokémon Showdown. Sobrescribirá los Pokémon actuales de este equipo.
         </p>
         <textarea
           value={importText}
           onChange={(e) => setImportText(e.target.value)}
           placeholder="Mimikyu @ Life Orb&#10;Ability: Disguise&#10;EVs: 252 Atk / 4 SpD / 252 Spe&#10;Jolly Nature&#10;- Swords Dance&#10;- Play Rough&#10;- Shadow Sneak&#10;- Shadow Claw"
           className="w-full h-64 p-4 text-sm text-gray-300 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-pink-500 transition-colors custom-scrollbar font-mono resize-none"
         />
         {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
       </div>

       <div className="p-4 border-t border-gray-800 bg-gray-950/50 flex justify-end gap-3">
         <button 
           onClick={onClose}
           className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
         >
           Cancelar
         </button>
         <button 
           onClick={handleImport}
           disabled={importText.trim().length === 0}
           className="px-6 py-2 text-sm font-bold text-white bg-pink-600 rounded-lg hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
         >
           Importar Equipo
         </button>
       </div>
     </motion.div>
   </div>
 </AnimatePresence>
);
}