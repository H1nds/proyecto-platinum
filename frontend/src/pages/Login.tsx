import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue al enviar el formulario
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Lógica para iniciar sesión
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Si sale bien, lo enviamos a la siguiente pantalla
        navigate('/dashboard'); 
      } else {
        // Lógica para registrarse
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });
        if (error) throw error;
        alert('¡Registro exitoso! Por favor, inicia sesión con tu nueva cuenta.');
        setIsLogin(true); // Lo devolvemos a la vista de login
      }
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">

      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-600/20 blur-[128px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 blur-[128px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md p-8 mx-4 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <motion.h2
            key={isLogin ? 'login-title' : 'register-title'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500"
          >
            Proyecto Platinum
          </motion.h2>
          <p className="mt-2 text-sm text-gray-400">
            {isLogin ? 'Bienvenido de vuelta, entrenador.' : 'Comienza tu aventura competitiva.'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Alerta de error con estilo coherente */}
          {error && (
            <div className="p-3 text-sm text-pink-500 bg-pink-500/10 border border-pink-500/20 rounded-xl text-center">
              {error}
            </div>
          )}

          {!isLogin && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="relative overflow-hidden"
            >
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
                <User size={20} />
              </div>
              <input
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!isLogin}
                className="w-full py-3 pl-12 pr-4 text-white bg-gray-950/50 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all placeholder-gray-600"
              />
            </motion.div>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
              <Mail size={20} />
            </div>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-3 pl-12 pr-4 text-white bg-gray-950/50 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all placeholder-gray-600"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-500">
              <Lock size={20} />
            </div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full py-3 pl-12 pr-4 text-white bg-gray-950/50 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all placeholder-gray-600"
            />
          </div>

          {/* Botón Principal */}
          <button 
            disabled={loading}
            className="flex items-center justify-center w-full py-3 mt-6 font-semibold text-white transition-all rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-lg hover:shadow-pink-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Procesando...</span>
            ) : isLogin ? (
              <>
                <LogIn size={20} className="mr-2" />
                Iniciar Sesión
              </>
            ) : (
              <>
                <UserPlus size={20} className="mr-2" />
                Crear Cuenta
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-medium text-pink-400 transition-colors hover:text-pink-300 focus:outline-none"
            >
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}