
import { useApp } from "../context/AppContext";

export default function Header({ activeTab, setActiveTab }) {
  const { darkMode, setDarkMode, currentUser, logout } = useApp();
  const isAdmin = currentUser?.rol === "Administrador";

  const SECCIONES = [
    { key: "portada", label: "Inicio", iconClass: "fas fa-rocket" },
    { key: "recursos", label: "Recursos", iconClass: "fas fa-book" },
    { key: "evidencias", label: "Evidencias", iconClass: "fas fa-images" },
    { key: "tutoriales", label: "Tutoriales", iconClass: "fab fa-youtube" },
    { key: "noticias", label: "Noticias", iconClass: "fas fa-bullhorn" },
    ...(isAdmin ? [{ key: "admin", label: "Gestión", iconClass: "fas fa-user-cog" }] : []),
  ];

  const getRoleBadge = (rol) => {
    if (rol === "Administrador") return "bg-amber-500 text-white";
    if (rol === "Docente") return "bg-blue-500 text-white";
    return "bg-gray-400 text-white";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-dark-card/85 backdrop-blur-lg border-b border-gray-150 dark:border-dark-border transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab("portada")}>
          <img 
            src="/Img logo AIP.jpeg" 
            alt="Logo AIP" 
            className="h-9 w-9 object-cover rounded-xl shadow-md"
          />
          <div className="text-left hidden sm:block">
            <h1 className="text-sm font-black tracking-tight uppercase text-gray-900 dark:text-white leading-none">
              Innova Bandera
            </h1>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold leading-none mt-0.5">
              I.E. Bandera del Perú · Pisco
            </p>
          </div>
        </div>

        {/* Navigation + Controls */}
        <div className="flex items-center gap-3">
          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-0.5 bg-gray-100 dark:bg-dark-border rounded-2xl p-1">
            {SECCIONES.map((s) => {
              const locked = false;
              return (
                <button
                  key={s.key}
                  onClick={() => !locked && setActiveTab(s.key)}
                  disabled={locked}
                  title={locked ? "Inicia sesión para acceder" : undefined}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${locked
                      ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      : activeTab === s.key
                        ? "bg-white dark:bg-dark-card text-primary dark:text-dark-accent-text shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                >
                  <i className={`${locked ? "fas fa-lock" : s.iconClass} text-[11px]`}></i>
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden md:block w-px h-5 bg-gray-200 dark:bg-dark-border"></div>


          {/* Login button — visible only when not authenticated */}
          {!currentUser && (
            <button
              onClick={() => setActiveTab("login")}
              className="p-2 rounded-xl bg-primary dark:bg-dark-accent hover:bg-blue-800 dark:hover:bg-blue-600 text-white transition-all shadow-md active:scale-95 flex items-center justify-center"
              title="Iniciar Sesión"
            >
              <i className="fas fa-sign-in-alt text-[12px]"></i>
            </button>
          )}

          {/* User info & logout — visible when authenticated */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] font-bold text-gray-900 dark:text-white leading-tight">
                  {currentUser.nombre}
                </div>
                <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-full mt-0.5 inline-block uppercase tracking-wider ${getRoleBadge(currentUser.rol)} ${isAdmin ? "animate-pulse" : ""}`}>
                  {isAdmin && <i className="fas fa-shield-alt mr-0.5"></i>}
                  {currentUser.rol}
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 transition-all flex items-center justify-center shadow-sm hover:shadow-md hover:border-red-600"
                title="Cerrar Sesión"
              >
                <i className="fas fa-sign-out-alt text-[12px]"></i>
              </button>
            </div>
          )}


          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-border transition-all flex items-center justify-center text-gray-700 dark:text-amber-400 shadow-sm"
            title={darkMode ? "Modo Claro" : "Modo Oscuro"}
          >
            {darkMode ? (
              <i className="fas fa-sun text-[13px]"></i>
            ) : (
              <i className="fas fa-moon text-[13px] text-primary"></i>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="max-w-6xl mx-auto px-4 pb-2.5 md:hidden">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {SECCIONES.map((s) => {
            const locked = false;
            return (
              <button
                key={s.key}
                onClick={() => !locked && setActiveTab(s.key)}
                disabled={locked}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${locked
                    ? "bg-gray-100 dark:bg-dark-border text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    : activeTab === s.key
                      ? "bg-primary dark:bg-dark-accent text-white"
                      : "bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-300"
                  }`}
              >
                <i className={locked ? "fas fa-lock" : s.iconClass}></i>
                {s.label}
              </button>
            );
          })}
          {!currentUser && (
            <button
              onClick={() => setActiveTab("login")}
              className="flex-shrink-0 p-2 rounded-xl bg-primary dark:bg-dark-accent text-white transition-all"
              title="Iniciar Sesión"
            >
              <i className="fas fa-sign-in-alt text-[12px]"></i>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
