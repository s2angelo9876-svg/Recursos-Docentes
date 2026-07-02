import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { API_BASE } from "../utils/api.js";
import { getYouTubeId, getYouTubeThumbnail, isValidYouTubeUrl } from "../utils/youtube";

const AREAS_CNEB = [
  "Matemática", "Comunicación", "Inglés", "Arte y Cultura",
  "Ciencias Sociales", "DPCC", "Educación Física", "Educación Religiosa",
  "Ciencia y Tecnología", "Educación para el Trabajo"
];
const GRADOS = ["1.° Sec", "2.° Sec", "3.° Sec", "4.° Sec", "5.° Sec"];
const TIPOS_RECURSO = ["Video", "Web / App", "PDF", "Simulación", "Juego", "Colección"];

/**
 * AdminModal — Modal CMS reutilizable para agregar/editar recursos, tutoriales y noticias.
 * Props:
 *   isOpen        {boolean}
 *   onClose       {function}
 *   type          {"recursos" | "tutoriales" | "noticias"}
 *   editingItem   {object | null}  — null para agregar
 */
export default function AdminModal({ isOpen, onClose, type, editingItem }) {
  const {
    addRecurso, updateRecurso,
    addTutorial, updateTutorial,
    addNoticia, updateNoticia,
    token, logout
  } = useApp();

  // ── Recursos ─────────────────────────────────────────────
  const [recTitulo, setRecTitulo] = useState("");
  const [recArea, setRecArea] = useState(AREAS_CNEB[0]);
  const [recGrados, setRecGrados] = useState([]);
  const [recTipo, setRecTipo] = useState(TIPOS_RECURSO[0]);
  const [recDesc, setRecDesc] = useState("");
  const [recContenidos, setRecContenidos] = useState([]);
  const [isCollection, setIsCollection] = useState(false);
  const [singleSourceType, setSingleSourceType] = useState("url");
  const [singleUrl, setSingleUrl] = useState("");
  const [singleFile, setSingleFile] = useState(null);

  // Mini-form para material en colección
  const [newMatTitulo, setNewMatTitulo] = useState("");
  const [newMatTipo, setNewMatTipo] = useState("url");
  const [newMatUrl, setNewMatUrl] = useState("");
  const [newMatFile, setNewMatFile] = useState(null);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);

  // ── Tutoriales ────────────────────────────────
  const [tutTitulo, setTutTitulo] = useState("");
  const [tutArea, setTutArea] = useState(AREAS_CNEB[0]);
  const [tutDesc, setTutDesc] = useState("");
  const [tutUrl, setTutUrl] = useState("");
  const [tutAudiencia, setTutAudiencia] = useState("ambos");

  // ── Noticias ──────────────────────────────────────────────
  const [notTitulo, setNotTitulo] = useState("");
  const [notDesc, setNotDesc] = useState("");
  const [notAutor, setNotAutor] = useState("");

  // ── Populate form when editing ────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      if (type === "recursos") {
        setRecTitulo(editingItem.titulo || "");
        setRecArea(editingItem.area || AREAS_CNEB[0]);
        setRecGrados(editingItem.grados || []);
        setRecTipo(editingItem.tipo || TIPOS_RECURSO[0]);
        setRecDesc(editingItem.desc || "");
        setRecContenidos(editingItem.contenidos || []);
        const isColl = editingItem.tipo === "Colección";
        setIsCollection(isColl);
        if (!isColl) {
          const firstCont = editingItem.contenidos?.[0];
          const isFile = firstCont?.tipo === "archivo";
          setSingleSourceType(isFile ? "archivo" : "url");
          setSingleUrl(isFile ? "" : (editingItem.url || ""));
          setSingleFile(null);
        } else {
          setSingleSourceType("url");
          setSingleUrl("");
          setSingleFile(null);
        }
        setNewMatTitulo(""); setNewMatTipo("url"); setNewMatUrl(""); setNewMatFile(null);
      } else if (type === "tutoriales") {
        setTutTitulo(editingItem.titulo || "");
        setTutArea(editingItem.area || AREAS_CNEB[0]);
        setTutDesc(editingItem.desc || "");
        setTutUrl(editingItem.url || "");
        setTutAudiencia(editingItem.audiencia || "ambos");
      } else if (type === "noticias") {
        setNotTitulo(editingItem.titulo || "");
        setNotDesc(editingItem.desc || "");
        setNotAutor(editingItem.autor || "");
      }
    } else {
      // Reset for "add" mode
      setRecTitulo(""); setRecArea(AREAS_CNEB[0]); setRecGrados([]); setRecTipo(TIPOS_RECURSO[0]);
      setRecDesc(""); setRecContenidos([]); setIsCollection(false);
      setSingleSourceType("url"); setSingleUrl(""); setSingleFile(null);
      setNewMatTitulo(""); setNewMatTipo("url"); setNewMatUrl(""); setNewMatFile(null);
      setUploadProgressMsg(""); setLoadingFile(false);
      setTutTitulo(""); setTutArea(AREAS_CNEB[0]); setTutDesc("");
      setTutUrl(""); setTutAudiencia("ambos");
      setNotTitulo(""); setNotDesc(""); setNotAutor("");
    }
  }, [isOpen, editingItem, type]);

  // ── Helpers ───────────────────────────────────────────────
  const handleGradeToggle = (grado) =>
    setRecGrados(prev => prev.includes(grado) ? prev.filter(g => g !== grado) : [...prev, grado]);

  const uploadFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo excede el límite permitido de 10 MB.");
      return null;
    }
    try {
      setLoadingFile(true);
      setUploadProgressMsg("Subiendo archivo...");
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: formData
      });
      if (response.status === 401 || response.status === 403) {
        logout();
        alert("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
        setUploadProgressMsg("Sesión inválida.");
        return null;
      }
      if (!response.ok) throw new Error("Error en la carga.");
      const resData = await response.json();
      setUploadProgressMsg("¡Archivo cargado!");
      setTimeout(() => setUploadProgressMsg(""), 2000);
      return resData.url;
    } catch (_err) {
      console.error(_err);
      alert("Fallo al subir archivo al servidor.");
      setUploadProgressMsg("Error al cargar.");
      return null;
    } finally {
      setLoadingFile(false);
    }
  };

  const handleAddMaterial = async () => {
    if (recContenidos.length >= 10) { alert("Máximo 10 materiales."); return; }
    if (!newMatTitulo) { alert("Escribe el nombre del material."); return; }
    let finalUrl = "";
    if (newMatTipo === "url") {
      if (!newMatUrl) { alert("Ingrese la URL."); return; }
      finalUrl = newMatUrl;
    } else {
      if (!newMatFile) { alert("Seleccione un archivo."); return; }
      const uploaded = await uploadFile(newMatFile);
      if (!uploaded) return;
      finalUrl = uploaded;
    }
    setRecContenidos(prev => [...prev, { id: Date.now(), titulo: newMatTitulo, tipo: newMatTipo, url: finalUrl, fileName: newMatTipo === "archivo" ? newMatFile.name : null }]);
    setNewMatTitulo(""); setNewMatUrl(""); setNewMatFile(null);
  };

  const handleRemoveMaterial = (id) =>
    setRecContenidos(prev => prev.filter(item => item.id !== id));

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (type === "recursos") {
      if (!recTitulo || !recDesc) { alert("Complete los campos obligatorios."); return; }
      let finalUrl, finalContenidos;
      if (isCollection) {
        if (recContenidos.length === 0) { alert("Añade al menos 1 material a la colección."); return; }
        finalUrl = recContenidos[0]?.url || "#";
        finalContenidos = recContenidos;
      } else {
        if (singleSourceType === "url") {
          if (!singleUrl) { alert("Ingrese la URL del recurso."); return; }
          finalUrl = singleUrl;
        } else {
          if (singleFile) {
            const uploaded = await uploadFile(singleFile);
            if (!uploaded) return;
            finalUrl = uploaded;
          } else if (editingItem?.url) {
            finalUrl = editingItem.url;
          } else {
            alert("Seleccione un archivo."); return;
          }
        }
        finalContenidos = [{ id: Date.now(), titulo: recTitulo, tipo: singleSourceType, url: finalUrl, fileName: singleSourceType === "archivo" ? (singleFile ? singleFile.name : finalUrl.split("/").pop()) : null }];
      }
      const data = { titulo: recTitulo, area: recArea, grados: recGrados.length > 0 ? recGrados : ["Cualquiera"], tipo: isCollection ? "Colección" : recTipo, desc: recDesc, url: finalUrl, contenidos: finalContenidos };
      editingItem ? await updateRecurso(editingItem.id, data) : await addRecurso(data);

    } else if (type === "tutoriales") {
      if (!tutTitulo || !tutDesc || !tutUrl) { alert("Complete los campos obligatorios."); return; }
      if (!isValidYouTubeUrl(tutUrl)) { alert("Ingrese un enlace válido de YouTube."); return; }
      const data = { titulo: tutTitulo, area: tutArea, desc: tutDesc, url: tutUrl, audiencia: tutAudiencia };
      editingItem ? await updateTutorial(editingItem.id, data) : await addTutorial(data);

    } else if (type === "noticias") {
      if (!notTitulo || !notDesc || !notAutor) { alert("Complete los campos obligatorios."); return; }
      const data = { titulo: notTitulo, desc: notDesc, autor: notAutor };
      editingItem ? await updateNoticia(editingItem.id, { ...editingItem, ...data }) : await addNoticia(data);
    }

    onClose();
  };

  if (!isOpen) return null;

  const typeLabel = type === "recursos" ? "Recurso" : type === "tutoriales" ? "Tutorial" : "Comunicado";
  const typeIcon = type === "recursos" ? "fas fa-book" : type === "tutoriales" ? "fab fa-youtube" : "fas fa-bullhorn";

  const youtubePreviewId = type === "tutoriales" ? getYouTubeId(tutUrl) : null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-800 dark:from-dark-border dark:to-dark-card px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <i className={`${typeIcon} text-white text-sm`}></i>
            </div>
            <div>
              <h4 className="font-black text-white uppercase text-sm tracking-tight">
                {editingItem ? "Editar" : "Nuevo"} {typeLabel}
              </h4>
              <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">
                Panel CMS · Solo Admin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* ── RECURSO FIELDS ──────────────────────────── */}
          {type === "recursos" && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Título *</label>
                <input
                  type="text" required
                  placeholder="Ej. Colección de Álgebra y Geometría"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent outline-none text-gray-800 dark:text-gray-200"
                  value={recTitulo} onChange={(e) => setRecTitulo(e.target.value)}
                />
              </div>

              {/* Collection toggle */}
              <div className="flex items-center gap-2.5 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <input
                  type="checkbox" id="isCollectionModal"
                  className="w-4 h-4 accent-primary dark:accent-dark-accent"
                  checked={isCollection}
                  onChange={(e) => { setIsCollection(e.target.checked); setRecTipo(e.target.checked ? "Colección" : TIPOS_RECURSO[0]); }}
                />
                <label htmlFor="isCollectionModal" className="text-xs font-bold text-blue-800 dark:text-blue-300 cursor-pointer select-none">
                  <i className="fas fa-layer-group mr-1.5"></i>¿Es una colección de múltiples materiales?
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Área Curricular</label>
                  <select className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs outline-none text-gray-700 dark:text-gray-200" value={recArea} onChange={(e) => setRecArea(e.target.value)}>
                    {AREAS_CNEB.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Categoría</label>
                  {isCollection ? (
                    <div className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-border/30 rounded-xl text-xs text-gray-500 font-bold uppercase">Colección</div>
                  ) : (
                    <select className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs outline-none text-gray-700 dark:text-gray-200" value={recTipo} onChange={(e) => setRecTipo(e.target.value)}>
                      {TIPOS_RECURSO.filter(t => t !== "Colección").map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block">Grados Dirigidos</label>
                <div className="flex flex-wrap gap-1.5">
                  {GRADOS.map(g => (
                    <button key={g} type="button" onClick={() => handleGradeToggle(g)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${recGrados.includes(g) ? "bg-primary dark:bg-dark-accent text-white border-primary" : "bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:bg-gray-50"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {isCollection ? (
                /* Collection builder */
                <div className="space-y-3 p-4 border border-dashed border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-border/20 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black uppercase text-gray-900 dark:text-white tracking-wider">Materiales (Máx. 10)</h5>
                    <span className="text-[9px] font-bold text-gray-400">{recContenidos.length} / 10</span>
                  </div>
                  {recContenidos.length > 0 && (
                    <div className="space-y-1.5">
                      {recContenidos.map(mat => (
                        <div key={mat.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border text-xs">
                          <div className="flex items-center gap-2 truncate flex-1 pr-2">
                            <i className={mat.tipo === "url" ? "fas fa-link text-blue-500" : "fas fa-file-alt text-orange-500"}></i>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{mat.titulo}</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveMaterial(mat.id)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"><i className="fas fa-times"></i></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {recContenidos.length < 10 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-dark-border space-y-2.5">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Nombre del Material</label>
                          <input type="text" placeholder="Ej. Ficha PDF de ejercicios" className="w-full px-2 py-1.5 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-lg text-[11px] outline-none text-gray-800 dark:text-gray-200" value={newMatTitulo} onChange={(e) => setNewMatTitulo(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Tipo</label>
                          <select className="w-full px-2 py-1.5 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-lg text-[11px] outline-none text-gray-700 dark:text-gray-300" value={newMatTipo} onChange={(e) => setNewMatTipo(e.target.value)}>
                            <option value="url">Enlace</option>
                            <option value="archivo">Archivo</option>
                          </select>
                        </div>
                      </div>
                      {newMatTipo === "url" ? (
                        <input type="url" placeholder="https://ejemplo.com/recurso" className="w-full px-2 py-1.5 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-lg text-[11px] outline-none text-gray-800 dark:text-gray-200" value={newMatUrl} onChange={(e) => setNewMatUrl(e.target.value)} />
                      ) : (
                        <label className="block w-full py-2 border border-dashed border-gray-300 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl text-center cursor-pointer text-[11px] font-bold text-gray-600 dark:text-gray-300">
                          <i className="fas fa-file-upload mr-1 text-primary"></i>
                          {newMatFile ? newMatFile.name : "Examinar archivo"}
                          <input type="file" onChange={(e) => setNewMatFile(e.target.files[0])} className="hidden" />
                        </label>
                      )}
                      {uploadProgressMsg && <div className="text-[9px] text-blue-600 dark:text-blue-400 font-black animate-pulse">{uploadProgressMsg}</div>}
                      <button type="button" disabled={loadingFile} onClick={handleAddMaterial} className="w-full py-1.5 bg-gray-100 dark:bg-dark-border hover:bg-primary hover:text-white dark:hover:bg-dark-accent text-gray-700 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 disabled:opacity-50">
                        {loadingFile ? "Subiendo..." : <><i className="fas fa-plus"></i> Agregar material</>}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Single resource source */
                <div className="space-y-3 p-4 border border-dashed border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-border/20 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block">Origen del Recurso *</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSingleSourceType("url")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${singleSourceType === "url" ? "bg-primary dark:bg-dark-accent text-white border-primary" : "bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border"}`}>
                      <i className="fas fa-link"></i> Enlace Web
                    </button>
                    <button type="button" onClick={() => setSingleSourceType("archivo")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${singleSourceType === "archivo" ? "bg-primary dark:bg-dark-accent text-white border-primary" : "bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border"}`}>
                      <i className="fas fa-file-upload"></i> Subir Archivo
                    </button>
                  </div>
                  {singleSourceType === "url" ? (
                    <input type="url" required placeholder="https://ejemplo.com/recurso" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none text-gray-800 dark:text-gray-200" value={singleUrl} onChange={(e) => setSingleUrl(e.target.value)} />
                  ) : (
                    <div className="space-y-1">
                      <label className="block w-full py-3 border border-dashed border-gray-300 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl text-center cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors">
                        <i className="fas fa-file-upload mr-2 text-primary dark:text-dark-accent text-lg"></i>
                        {singleFile ? singleFile.name : (editingItem?.url ? "Cambiar archivo actual" : "Examinar archivo")}
                        <input type="file" onChange={(e) => setSingleFile(e.target.files[0])} className="hidden" />
                      </label>
                      {!singleFile && editingItem?.url && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 italic font-bold text-center">✓ Archivo actual en Supabase Storage</div>
                      )}
                    </div>
                  )}
                  {uploadProgressMsg && <div className="text-[9px] text-blue-600 dark:text-blue-400 font-black animate-pulse">{uploadProgressMsg}</div>}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Descripción *</label>
                <textarea required rows={3} placeholder="Breve explicación del recurso..." className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none text-gray-800 dark:text-gray-200 resize-none" value={recDesc} onChange={(e) => setRecDesc(e.target.value)} />
              </div>
            </>
          )}

          {/* ── TUTORIAL FIELDS ──────────────────────────── */}
          {type === "tutoriales" && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Título del Tutorial *</label>
                <input type="text" required placeholder="Ej. Uso de Canva en el Aula" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none text-gray-800 dark:text-gray-200" value={tutTitulo} onChange={(e) => setTutTitulo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Área Curricular</label>
                  <select className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs outline-none text-gray-700 dark:text-gray-200" value={tutArea} onChange={(e) => setTutArea(e.target.value)}>
                    {AREAS_CNEB.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Audiencia *</label>
                  <select className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs outline-none text-gray-700 dark:text-gray-200" value={tutAudiencia} onChange={(e) => setTutAudiencia(e.target.value)}>
                    <option value="docente">Docente</option>
                    <option value="estudiante">Estudiante</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Enlace de YouTube *</label>
                <input type="url" required placeholder="https://www.youtube.com/watch?v=..." className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none text-gray-800 dark:text-gray-200" value={tutUrl} onChange={(e) => setTutUrl(e.target.value)} />
                {tutUrl && !isValidYouTubeUrl(tutUrl) && (
                  <p className="text-[10px] text-red-500 font-bold">URL de YouTube no válida.</p>
                )}
              </div>
              {youtubePreviewId && (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border">
                  <img src={getYouTubeThumbnail(youtubePreviewId)} alt="Vista previa" className="w-full h-32 object-cover" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Descripción *</label>
                <textarea required rows={3} placeholder="Describe el contenido del tutorial..." className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none text-gray-800 dark:text-gray-200 resize-none" value={tutDesc} onChange={(e) => setTutDesc(e.target.value)} />
              </div>
            </>
          )}

          {/* ── NOTICIA FIELDS ────────────────────────────── */}
          {type === "noticias" && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Título del Comunicado *</label>
                <input type="text" required placeholder="Ej. Resultados de la Convocatoria" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none text-gray-800 dark:text-gray-200" value={notTitulo} onChange={(e) => setNotTitulo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Autor / Emisor *</label>
                <input type="text" required placeholder="Ej. Coordinación Pedagógica" className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none text-gray-800 dark:text-gray-200" value={notAutor} onChange={(e) => setNotAutor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Contenido *</label>
                <textarea required rows={4} placeholder="Texto del comunicado oficial..." className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none text-gray-800 dark:text-gray-200 resize-none" value={notDesc} onChange={(e) => setNotDesc(e.target.value)} />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-gray-150 dark:border-dark-border flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loadingFile} className="px-5 py-2 bg-primary dark:bg-dark-accent hover:bg-blue-800 dark:hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5">
              <i className="fas fa-save"></i> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
