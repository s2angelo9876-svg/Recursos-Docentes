import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function Login({ onLoginSuccess }) {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Por favor, ingrese su usuario y contraseña.");
      return;
    }
    try {
      setError("");
      setLoading(true);
      const res = await login(username, password);
      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.error || "Usuario o contraseña incorrectos.");
      }
    } catch {
      setError("Ocurrió un error al intentar iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="relative bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">

        {/* Decorative top bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-red-500 to-blue-600"></div>

        {/* Glow spheres */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/8 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-red-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="p-8 relative">
          {/* Logo */}
          <div className="text-center mb-7">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-blue-800 dark:from-dark-accent dark:to-blue-700 text-white flex items-center justify-center font-black text-xl mx-auto shadow-lg mb-4 ring-4 ring-primary/20">
              <i className="fas fa-shield-alt text-lg"></i>
            </div>
            <h2 className="text-xl font-black uppercase text-gray-900 dark:text-white tracking-tight">
              Innova Bandera
            </h2>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">
              Acceso al Sistema
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <i className="fas fa-exclamation-circle flex-shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Usuario</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 text-xs">
                  <i className="fas fa-user"></i>
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ingrese su usuario"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent transition-shadow"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500 text-xs">
                  <i className="fas fa-lock"></i>
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent transition-shadow"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
                >
                  <i className={`fas ${showPass ? "fa-eye-slash" : "fa-eye"} text-xs`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-blue-700 dark:from-dark-accent dark:to-blue-600 hover:from-blue-800 hover:to-primary text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Verificando...</>
              ) : (
                <><i className="fas fa-sign-in-alt"></i> Iniciar Sesión</>
              )}
            </button>
          </form>

          {/* Info note */}
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-5 font-medium">
            <i className="fas fa-info-circle mr-1"></i>
            Acceso restringido al personal autorizado de la I.E.
          </p>
        </div>
      </div>
    </div>
  );
}
