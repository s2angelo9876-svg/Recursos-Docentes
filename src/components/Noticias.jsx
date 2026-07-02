import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

export default function Noticias({ isAdminMode = false, onEditClick = null }) {
  const { noticias, deleteNoticia } = useApp();
  const [selectedNews, setSelectedNews] = useState(null);
  const [lastVisit, setLastVisit] = useState(0);

  useEffect(() => {
    const prevVisit = localStorage.getItem("innova_last_noticias_visit");
    // If first time, highlight items from last 48 hours. Otherwise, items since last visit.
    setLastVisit(prevVisit ? Number(prevVisit) : Date.now() - 48 * 60 * 60 * 1000);
    localStorage.setItem("innova_last_noticias_visit", String(Date.now()));
  }, []);

  return (
    <div className="space-y-4">
      {noticias.length > 0 ? (
        <AnimatePresence mode="popLayout">
          {noticias.map((n) => (
            <motion.div
              layout
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="rounded-2xl border border-gray-150 dark:border-dark-border p-5 bg-white dark:bg-dark-card shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left group"
            >
              <div className="space-y-2 flex-1">
                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <i className="far fa-calendar-alt"></i> {n.fecha}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-50 dark:bg-dark-border text-gray-500 dark:text-gray-400 rounded-md border border-gray-100 dark:border-dark-border">
                    <i className="fas fa-user-edit text-[8px] mr-1"></i> {n.autor}
                  </span>
                  {(() => {
                    const createdTime = n.createdAt ? new Date(n.createdAt).getTime() : 0;
                    const isNew = lastVisit && createdTime && createdTime > lastVisit;
                    return isNew && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-md uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                        <i className="fas fa-sparkles text-[7px]"></i> Nuevo
                      </span>
                    );
                  })()}
                </div>

                {/* Content */}
                <h3 className="font-bold text-lg text-gray-950 dark:text-white group-hover:text-primary dark:group-hover:text-dark-accent-text transition-colors leading-tight uppercase">
                  {n.titulo}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                  {n.desc}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-dark-border justify-end">
                <button
                  onClick={() => setSelectedNews(n)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gray-50 dark:bg-dark-border hover:bg-primary dark:hover:bg-dark-accent hover:text-white text-gray-700 dark:text-gray-300 transition-all rounded-xl border border-gray-150 dark:border-dark-border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 group"
                >
                  Leer <i className="fas fa-chevron-right text-[8px] group-hover:translate-x-0.5 transition-transform"></i>
                </button>

                {/* Admin Controls */}
                {isAdminMode && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEditClick(n)}
                      className="p-2 bg-amber-50 dark:bg-amber-950/10 hover:bg-amber-500 hover:text-white border border-amber-250 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold transition-all"
                      title="Editar Comunicado"
                    >
                      <i className="fas fa-edit text-[11px]"></i>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("¿Seguro que deseas eliminar este comunicado?")) {
                          deleteNoticia(n.id);
                        }
                      }}
                      className="p-2 bg-red-50 dark:bg-red-950/10 hover:bg-red-600 hover:text-white border border-red-250 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-xs font-bold transition-all"
                      title="Eliminar Comunicado"
                    >
                      <i className="fas fa-trash-alt text-[11px]"></i>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      ) : (
        <div className="py-16 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-200 dark:border-dark-border text-center">
          <i className="fas fa-bullhorn text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 uppercase">Sin comunicados</h3>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            No se han publicado noticias o comunicados recientes.
          </p>
        </div>
      )}

      {/* READING MODAL (Punto 5) */}
      {selectedNews && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="bg-gray-50 dark:bg-dark-border px-6 py-4 flex items-center justify-between border-b border-gray-150 dark:border-dark-border">
              <h4 className="font-bold text-gray-900 dark:text-white uppercase text-xs">
                <i className="fas fa-bullhorn mr-1.5 text-primary dark:text-dark-accent"></i> Comunicado Oficial
              </h4>
              <button
                onClick={() => setSelectedNews(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-dark-card flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 dark:text-gray-450 font-bold uppercase tracking-wider">
                <span><i className="far fa-calendar-alt"></i> {selectedNews.fecha}</span>
                <span>•</span>
                <span><i className="fas fa-user-edit"></i> Emitido por: {selectedNews.autor}</span>
              </div>

              <h2 className="text-xl font-black text-gray-950 dark:text-white leading-tight uppercase border-b pb-2">
                {selectedNews.titulo}
              </h2>

              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                {selectedNews.desc}
              </p>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-dark-border px-6 py-4 flex justify-end border-t border-gray-150 dark:border-dark-border">
              <button
                onClick={() => setSelectedNews(null)}
                className="px-5 py-2 bg-primary dark:bg-dark-accent hover:bg-red-650 dark:hover:bg-blue-650 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                Cerrar Lectura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
