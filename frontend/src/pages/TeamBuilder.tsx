import { motion } from 'framer-motion';

export default function TeamBuilder() {
  return (
    <div className="min-h-screen p-8 text-white bg-gray-950">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500"
      >
        Team Builder
      </motion.h1>
      <p className="mt-4 text-gray-400">Pronto prepararemos a tu Mimikyu para la batalla...</p>
    </div>
  );
}