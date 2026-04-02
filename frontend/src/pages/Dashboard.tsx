import { motion } from 'framer-motion';
import { Swords, Trophy, Users, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8 relative z-10">
      {/* Bienvenida */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Bienvenido al <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">Lobby</span>
        </h1>
        <p className="mt-2 text-gray-400">¿Qué te gustaría hacer hoy?</p>
      </div>

      {/* Grid Principal Adaptativo (1 col en móvil, 2 o 3 en PC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Tarjeta Principal: Buscar Batalla */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="relative overflow-hidden group rounded-3xl bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 backdrop-blur-md p-6 md:p-8 h-full min-h-[200px] flex flex-col justify-between cursor-pointer transition-all hover:border-pink-500/40 hover:shadow-xl hover:shadow-pink-500/10">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Swords size={120} />
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <Swords size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Buscar Batalla</h2>
              <p className="text-pink-200/70 max-w-sm">
                Encuentra un oponente al azar o desafía a un amigo en formato VGC o Singles.
              </p>
            </div>
            <button className="mt-6 self-start px-6 py-2.5 bg-pink-500 hover:bg-pink-400 text-white font-semibold rounded-xl transition-colors">
              Jugar Ahora
            </button>
          </div>
        </motion.div>

        {/* Tarjeta: Team Builder */}
        <motion.div variants={itemVariants}>
          <Link to="/teambuilder" className="block relative overflow-hidden group rounded-3xl bg-gray-900/60 border border-gray-800 backdrop-blur-md p-6 h-full flex flex-col transition-all hover:bg-gray-800/80 hover:border-gray-700">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Star size={24} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Team Builder</h2>
            <p className="text-gray-400 text-sm mb-6 flex-1">
              Construye y ajusta las estadísticas, habilidades y movimientos de tu equipo ideal.
            </p>
            <div className="text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Entrar al laboratorio →
            </div>
          </Link>
        </motion.div>

        {/* Tarjeta: Torneos */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden group rounded-3xl bg-gray-900/60 border border-gray-800 backdrop-blur-md p-6 h-full flex flex-col transition-all hover:bg-gray-800/80 hover:border-gray-700 cursor-not-allowed opacity-80">
            <div className="absolute top-4 right-4 px-2 py-1 bg-gray-800 text-xs font-bold text-gray-400 rounded-md">Próximamente</div>
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-500 flex items-center justify-center mb-4">
              <Trophy size={24} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Torneos</h2>
            <p className="text-gray-400 text-sm">
              Compite en eventos organizados y sube en el ranking de la temporada.
            </p>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}