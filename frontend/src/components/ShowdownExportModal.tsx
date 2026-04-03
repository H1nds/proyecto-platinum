import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { Team } from '../store/useTeamStore';

interface ShowdownExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null; // Protegemos el equipo
}

export default function ShowdownExportModal({ isOpen, onClose, team }: ShowdownExportModalProps) {
  const [copied, setCopied] = useState(false);

  const generateShowdownText = () => {
    // ESCUDO: Si no hay equipo o los miembros no son un arreglo, no hacemos nada
    if (!team || !Array.isArray(team.members)) return '';

    return team.members
      .filter(p => p && p.pokemonId && p.name)
      .map(p => {
        let text = `${p.name}`;
        if (p.item) text += ` @ ${p.item}`;
        text += '\n';
        
        if (p.ability) text += `Ability: ${p.ability}\n`;
        if (p.level && p.level !== 100) text += `Level: ${p.level}\n`;

        const evs: string[] = [];
        const evOrder: (keyof typeof p.evs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
        const evLabels = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
        
        evOrder.forEach(stat => {
          if (p.evs && p.evs[stat] > 0) evs.push(`${p.evs[stat]} ${evLabels[stat]}`);
        });
        if (evs.length > 0) text += `EVs: ${evs.join(' / ')}\n`;

        if (p.nature && p.nature !== 'Serious') text += `${p.nature} Nature\n`;

        const ivs: string[] = [];
        evOrder.forEach(stat => {
          if (p.ivs && p.ivs[stat] < 31) ivs.push(`${p.ivs[stat]} ${evLabels[stat]}`);
        });
        if (ivs.length > 0) text += `IVs: ${ivs.join(' / ')}\n`;

        if (p.moves && Array.isArray(p.moves)) {
          p.moves.forEach(m => {
            if (m) text += `- ${m}\n`;
          });
        }
        
        return text;
      }).join('\n\n');
  };

  const exportText = generateShowdownText();

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {/* Movemos el render aquí adentro para que las animaciones de salida funcionen */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Share2 size={20} className="text-pink-500" />
                Exportar Equipo
              </h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 flex-1">
              <p className="text-sm text-gray-400 mb-3">
                Copia este texto para compartir tu equipo con amigos o usarlo en Pokémon Showdown.
              </p>
              <textarea
                readOnly
                value={exportText}
                className="w-full h-64 p-4 text-sm text-gray-300 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-pink-500 transition-colors custom-scrollbar font-mono resize-none"
              />
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-950/50 flex justify-end gap-3">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-pink-600 rounded-lg hover:bg-pink-500 transition-all"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? '¡Copiado!' : 'Copiar al Portapapeles'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}