import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { getYouTubeId, getYouTubeThumbnail } from "../utils/youtube";

function YouTubeThumbnail({ url, title }) {
  const id = getYouTubeId(url);
  const [imgError, setImgError] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (!id) {
    return (
      <div className="w-full h-36 bg-gray-100 dark:bg-dark-border rounded-xl flex items-center justify-center">
        <i className="fas fa-link text-gray-400 text-2xl"></i>
      </div>
    );
  }

  if (playing) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const thumb = imgError
    ? getYouTubeThumbnail(id, "0")
    : getYouTubeThumbnail(id, "mqdefault");

  return (
    <div
      className="relative w-full h-36 rounded-xl overflow-hidden cursor-pointer group/thumb"
      onClick={() => setPlaying(true)}
    >
      <img
        src={thumb}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
        onError={() => setImgError(true)}
      />
      <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/50 transition-colors flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl group-hover/thumb:scale-110 transition-transform">
          <i className="fas fa-play text-white text-sm ml-1"></i>
        </div>
      </div>
    </div>
  );
}

function AccessSelector({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-lg mb-4 ring-4 ring-red-500/20">
          <i className="fab fa-youtube"></i>
        </div>
        <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white tracking-tight">
          Tutoriales TIC
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-semibold">
          ¿Cómo deseas acceder a los tutoriales?
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={() => onSelect("docente")}
          className="group relative overflow-hidden p-8 rounded-[24px] border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-dark-card hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all text-left cursor-pointer active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[22px]" />
          <div className="relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform shadow-sm">
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">
              Docente
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
              Accede al catálogo completo de tutoriales pedagógicos y recursos TIC.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest group-hover:gap-2.5 transition-all">
              Ingresar <i className="fas fa-arrow-right text-[9px]"></i>
            </span>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          onClick={() => onSelect("estudiante")}
          className="group relative overflow-hidden p-8 rounded-[24px] border-2 border-green-200 dark:border-green-900/50 bg-white dark:bg-dark-card hover:border-green-500 dark:hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/10 transition-all text-left cursor-pointer active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[22px]" />
          <div className="relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform shadow-sm">
              <i className="fas fa-user-graduate"></i>
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">
              Estudiante
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
              Explora tutoriales educativos y aprende con videos seleccionados por tus docentes.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest group-hover:gap-2.5 transition-all">
              Ingresar <i className="fas fa-arrow-right text-[9px]"></i>
            </span>
          </div>
        </motion.button>
      </div>
    </div>
  );
}

export default function Tutoriales({ isAdminMode = false, onEditClick = null, onDeleteClick = null }) {
  const { tutoriales, deleteTutorial } = useApp();
  const [busqueda, setBusqueda] = useState("");
  const [accessType, setAccessType] = useState(() => {
    if (isAdminMode) return null;
    return localStorage.getItem("innova_tutorial_access") || null;
  });

  useEffect(() => {
    if (!isAdminMode && accessType) {
      localStorage.setItem("innova_tutorial_access", accessType);
    }
  }, [accessType, isAdminMode]);

  const tutorialesFiltrados = useMemo(() => {
    return tutoriales.filter((p) => {
      if (!getYouTubeId(p.url)) return false;

      const matchAudiencia =
        isAdminMode ||
        !accessType ||
        p.audiencia === "ambos" ||
        p.audiencia === accessType;

      const matchBusqueda =
        (p.titulo || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.desc || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.area || "").toLowerCase().includes(busqueda.toLowerCase());

      return matchAudiencia && matchBusqueda;
    });
  }, [tutoriales, busqueda, accessType, isAdminMode]);

  if (!accessType && !isAdminMode) {
    return <AccessSelector onSelect={setAccessType} />;
  }

  return (
    <div className="space-y-6">
      {accessType && !isAdminMode && (
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${accessType === "docente"
              ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40"
              : "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/40"
            }`}>
            <i className={`fas ${accessType === "docente" ? "fa-chalkboard-teacher" : "fa-user-graduate"}`}></i>
            Modo {accessType === "docente" ? "Docente" : "Estudiante"}
          </div>
          <button
            onClick={() => setAccessType(null)}
            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
          >
            <i className="fas fa-exchange-alt text-[9px]"></i> Cambiar
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-gray-150 dark:border-dark-border shadow-sm transition-colors">
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 text-xs">
            <i className="fas fa-search"></i>
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent text-xs"
            placeholder="Buscar tutoriales por título, área o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {tutorialesFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {tutorialesFiltrados.map((p) => (
              <motion.div
                layout
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col overflow-hidden"
              >
                <div className="p-3 pb-0">
                  <YouTubeThumbnail url={p.url} title={p.titulo} />
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[9px] text-blue-600 dark:text-dark-accent-text font-black uppercase tracking-wide">
                      {p.area}
                    </div>
                    {p.audiencia && p.audiencia !== "ambos" && (
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${p.audiencia === "docente"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                          : "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                        }`}>
                        {p.audiencia}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2 uppercase leading-tight line-clamp-2">
                    {p.titulo}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 flex-1">
                    {p.desc}
                  </p>

                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full py-2 bg-red-50 dark:bg-red-950/10 hover:bg-red-600 hover:text-white border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 transition-all rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <i className="fab fa-youtube"></i> Ver en YouTube
                  </a>

                  {isAdminMode && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onEditClick && onEditClick(p)}
                        className="flex-1 py-1.5 bg-amber-50 dark:bg-amber-950/10 hover:bg-amber-500 hover:text-white border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <i className="fas fa-edit text-[9px]"></i> Editar
                      </button>
                      <button
                        onClick={() => onDeleteClick ? onDeleteClick(p.id) : (window.confirm("¿Eliminar este tutorial?") && deleteTutorial(p.id))}
                        className="flex-1 py-1.5 bg-red-50 dark:bg-red-950/10 hover:bg-red-600 hover:text-white border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <i className="fas fa-trash-alt text-[9px]"></i> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-16 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-200 dark:border-dark-border text-center">
          <i className="fab fa-youtube text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 uppercase">Sin tutoriales disponibles</h3>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 max-w-xs mx-auto">
            {isAdminMode
              ? 'Agrega el primer tutorial usando el botón "Nuevo".'
              : "No hay tutoriales para este perfil o prueba cambiar los criterios de búsqueda."}
          </p>
        </div>
      )}
    </div>
  );
}
