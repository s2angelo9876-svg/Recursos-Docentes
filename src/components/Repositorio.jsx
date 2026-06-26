import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

const AREAS_CNEB = [
  "Matemática",
  "Comunicación",
  "Inglés",
  "Arte y Cultura",
  "Ciencias Sociales",
  "DPCC",
  "Educación Física",
  "Educación Religiosa",
  "Ciencia y Tecnología",
  "Educación para el Trabajo"
];

const GRADOS = ["1.° Sec", "2.° Sec", "3.° Sec", "4.° Sec", "5.° Sec"];

export default function Repositorio({ isAdminMode = false, onEditClick = null, onDeleteClick = null }) {
  // Traemos las acciones globales de nuestro contexto sincronizado con el Backend CMS
  const { recursos, favoritos, toggleFavorito, deleteRecurso } = useApp();

  const [busqueda, setBusqueda] = useState("");
  const [areaSel, setAreaSel] = useState("Todas");
  const [gradoSel, setGradoSel] = useState("Todos");

  // Estado extendido para el acordeón de materiales múltiples
  const [expandedCards, setExpandedCards] = useState([]);

  const toggleCardExpansion = (id) => {
    setExpandedCards((prev) =>
      prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id]
    );
  };

  // Lógica de filtrado reactiva basada en useMemo
  const filtrados = useMemo(() => {
    // Si recursos viene vacío del backend temporalmente, evitamos que rompa con una alternativa segura []
    const listaRecursos = recursos || [];
    return listaRecursos.filter((r) => {
      const matchArea = areaSel === "Todas" || r.area === areaSel;
      // Verificación segura de que r.grados exista antes de usar includes
      const matchGrado = gradoSel === "Todos" || (r.grados && r.grados.includes(gradoSel));
      const matchBusqueda =
        (r.titulo || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.desc || "").toLowerCase().includes(busqueda.toLowerCase());

      return matchArea && matchGrado && matchBusqueda;
    });
  }, [recursos, areaSel, gradoSel, busqueda]);

  // Selector de íconos del card principal
  const getIconClass = (tipo) => {
    const t = (tipo || "").toLowerCase();
    if (t.includes("video")) return "fas fa-play-circle text-red-500";
    if (t.includes("web") || t.includes("app")) return "fas fa-globe text-blue-500";
    if (t.includes("simul")) return "fas fa-flask text-emerald-500";
    if (t.includes("juego")) return "fas fa-gamepad text-purple-500";
    if (t.includes("colec")) return "fas fa-folder text-amber-500";
    return "fas fa-file-pdf text-orange-500";
  };

  // Selector de íconos para sub-recursos dentro del acordeón
  const getSubIconClass = (tipo, url) => {
    const t = (tipo || "").toLowerCase();
    const u = (url || "").toLowerCase();
    if (u.endsWith(".pdf") || t.includes("pdf")) return "far fa-file-pdf text-red-500";
    if (u.endsWith(".mp4") || u.endsWith(".mov") || t.includes("video")) return "far fa-file-video text-blue-500";
    if (u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".gif")) return "far fa-file-image text-emerald-500";
    return "fas fa-link text-gray-400";
  };

  return (
    <div className="space-y-6">
      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-gray-150 dark:border-dark-border shadow-sm space-y-4 transition-colors duration-300">

        {/* Fila 1: Input y selector de área */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 text-xs">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent text-xs"
              placeholder="Buscar recursos por tema, título, descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <select
            className="border border-gray-200 dark:border-dark-border rounded-xl px-3 py-2 text-xs bg-white dark:bg-dark-card text-gray-700 dark:text-gray-200 outline-none"
            value={areaSel}
            onChange={(e) => setAreaSel(e.target.value)}
          >
            <option value="Todas">Todas las Áreas</option>
            {AREAS_CNEB.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Fila 2: Filtros por grado en formato pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-dark-border">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-2">
            Grado:
          </span>
          <button
            onClick={() => setGradoSel("Todos")}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${gradoSel === "Todos"
              ? "bg-primary dark:bg-dark-accent text-white border-primary dark:border-dark-accent"
              : "bg-gray-50 dark:bg-dark-border text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-100"
              }`}
          >
            Todos
          </button>
          {GRADOS.map((g) => (
            <button
              key={g}
              onClick={() => setGradoSel(g)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${gradoSel === g
                ? "bg-primary dark:bg-dark-accent text-white border-primary dark:border-dark-accent"
                : "bg-gray-50 dark:bg-dark-border text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-100"
                }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Recursos en Pantalla */}
      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtrados.map((r) => {
              const isFav = favoritos && favoritos.includes(r.id);
              const isExpanded = expandedCards.includes(r.id);

              return (
                <motion.div
                  layout
                  key={r.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl border border-gray-150 dark:border-dark-border p-5 bg-white dark:bg-dark-card shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-dark-border border border-gray-100 dark:border-dark-border flex items-center justify-center">
                          <i className={`${getIconClass(r.tipo)} text-sm`}></i>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-150 dark:bg-dark-border text-gray-500 dark:text-gray-400 rounded uppercase tracking-wider">
                          {r.tipo}
                        </span>
                      </div>

                      {/* Botón de Favorito Local */}
                      <button
                        onClick={() => toggleFavorito(r.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors group"
                        title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
                      >
                        <i
                          className={`${isFav ? "fas text-amber-500" : "far text-gray-400 group-hover:text-amber-500"
                            } fa-star text-[14px]`}
                        ></i>
                      </button>
                    </div>

                    {/* Meta-información y Títulos */}
                    <div className="text-left">
                      <div className="text-[9px] text-blue-600 dark:text-dark-accent-text font-black uppercase tracking-wide mb-1">
                        {r.area}
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2 leading-tight uppercase text-sm">
                        {r.titulo}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-3 font-medium">
                        {r.desc}
                      </p>

                      {/* Badges de Grados Escolares */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {r.grados && r.grados.map((g) => (
                          <span
                            key={g}
                            className="text-[9px] bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100/50 dark:border-red-900/40 font-bold"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bloque del CMS para Despliegue de Enlaces y Documentos */}
                  <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-dark-border text-left">

                    {r.contenidos && r.contenidos.length > 1 ? (
                      /* Acordeón para múltiples materiales adjuntos */
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => toggleCardExpansion(r.id)}
                          className="w-full py-2 px-3 bg-gray-50 dark:bg-dark-border hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300 transition-colors rounded-xl border border-gray-150 dark:border-dark-border text-xs font-black uppercase tracking-wider flex items-center justify-between"
                        >
                          <span>
                            <i className="fas fa-layer-group mr-1.5 text-primary dark:text-dark-accent"></i>
                            Materiales ({r.contenidos.length})
                          </span>
                          <i className={`fas ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`}></i>
                        </button>

                        {isExpanded && (
                          <div className="space-y-1.5 pt-1.5 max-h-48 overflow-y-auto">
                            {r.contenidos.map((mat) => (
                              <a
                                key={mat.id}
                                href={mat.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 dark:bg-dark-border/40 hover:bg-primary/5 border border-gray-100 dark:border-dark-border/60 transition-all text-xs"
                                title={`Abrir: ${mat.titulo}`}
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <i className={`${getSubIconClass(mat.tipo, mat.url)} text-[11px] shrink-0`}></i>
                                  <span className="font-semibold text-gray-750 dark:text-gray-300 truncate">{mat.titulo}</span>
                                </div>
                                <i className="fas fa-external-link-alt text-[9px] text-gray-400"></i>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Renderizado clásico para un único enlace o archivo local adjunto */
                      (() => {
                        const singleUrl = r.contenidos && r.contenidos[0] ? r.contenidos[0].url : r.url;
                        const finalUrl = singleUrl;
                        return (
                          <a
                            href={finalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-gray-50 dark:bg-dark-border hover:bg-primary dark:hover:bg-dark-accent hover:text-white text-gray-700 dark:text-gray-300 transition-colors rounded-xl border border-gray-150 dark:border-dark-border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                          >
                            <i className="fas fa-external-link-alt text-[10px]"></i> Abrir Recurso
                          </a>
                        );
                      })()
                    )}

                    {/* ACCIONES DE ADMINISTRADOR: Visibles solo si el token JWT es válido */}
                    {isAdminMode && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => onEditClick && onEditClick(r)}
                          className="flex-1 py-1.5 bg-amber-50 dark:bg-amber-950/10 hover:bg-amber-500 hover:text-white border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <i className="fas fa-edit text-[9px]"></i> Editar
                        </button>
                        <button
                          onClick={() => onDeleteClick ? onDeleteClick(r.id) : (window.confirm("¿Eliminar este recurso?") && deleteRecurso(r.id))}
                          className="flex-1 py-1.5 bg-red-50 dark:bg-red-950/10 hover:bg-red-600 hover:text-white border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <i className="fas fa-trash-alt text-[9px]"></i> Eliminar
                        </button>
                      </div>
                    )}

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-200 dark:border-dark-border text-center">
          <i className="fas fa-folder-open text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 uppercase">Sin recursos encontrados</h3>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 max-w-xs mx-auto">
            Prueba a cambiar los criterios de búsqueda, área o grado.
          </p>
        </div>
      )}
    </div>
  );
}