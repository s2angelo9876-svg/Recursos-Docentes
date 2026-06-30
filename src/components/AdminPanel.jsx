import React, { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import Repositorio from "./Repositorio";
import Tutoriales from "./Tutoriales";
import Noticias from "./Noticias";
import AdminModal from "./AdminModal";
import AuditoriaPanel from "./AuditoriaPanel";

const AREAS_CNEB = [
  "Matemática", "Comunicación", "Inglés", "Arte y Cultura",
  "Ciencias Sociales", "DPCC", "Educación Física", "Educación Religiosa",
  "Ciencia y Tecnología", "Educación para el Trabajo"
];

export default function AdminPanel() {
  const {
    recursos,
    tutoriales,
    noticias,
    exportData,
    importData,
    token,
    currentUser,
    register,
    deleteTutorial,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState("recursos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState("recursos");
  const [importStatus, setImportStatus] = useState("");

  // User Management State
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formUsuario, setFormUsuario] = useState("");
  const [formContrasenia, setFormContrasenia] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef(null);

  const fetchUsuarios = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/auth/users", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      }
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "usuarios") {
      fetchUsuarios();
    }
  }, [activeSubTab]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formNombre || !formUsuario || !formContrasenia) {
      setUserError("Todos los campos son obligatorios.");
      return;
    }
    if (formContrasenia.length < 6) {
      setUserError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      setCreatingUser(true);
      setUserError("");
      setUserSuccess("");
      // El rol se define fijamente en "Docente" a petición del usuario
      const res = await register(formNombre, formUsuario, formContrasenia, "Docente");
      if (res.success) {
        setUserSuccess(`Usuario docente "${formUsuario}" creado con éxito.`);
        setFormNombre("");
        setFormUsuario("");
        setFormContrasenia("");
        fetchUsuarios();
      } else {
        setUserError(res.error || "No se pudo crear el usuario.");
      }
    } catch (err) {
      setUserError("Error de conexión al crear usuario.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    try {
      setImportingExcel(true);
      setUserError("");
      setUserSuccess("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/docentes/bulk-upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        let msg = `Carga masiva finalizada. Creados: ${data.insertedCount}`;
        if (data.duplicateCount > 0) {
          msg += `, Omitidos por duplicado: ${data.duplicateCount}`;
        }
        if (data.invalidCount > 0) {
          msg += `, Omitidos por error: ${data.invalidCount}`;
        }
        setUserSuccess(msg);
        fetchUsuarios();
      } else {
        setUserError(data.error || "Ocurrió un error al procesar el archivo Excel.");
      }
    } catch (err) {
      setUserError("Error de conexión al cargar el archivo Excel.");
      console.error(err);
    } finally {
      setImportingExcel(false);
    }
  };

  const handleDeleteUser = async (userId, userUsername) => {
    if (userUsername === currentUser?.usuario) {
      alert("No puedes eliminar tu propio usuario administrador.");
      return;
    }
    if (userUsername === "admin") {
      alert("No se puede eliminar el usuario administrador principal.");
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${userUsername}"?`)) {
      return;
    }
    try {
      setUserError("");
      setUserSuccess("");
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        setUserSuccess(`Usuario "${userUsername}" eliminado con éxito.`);
        fetchUsuarios();
      } else {
        const data = await response.json();
        setUserError(data.error || "Error al eliminar usuario.");
      }
    } catch (err) {
      setUserError("Error de conexión al eliminar usuario.");
    }
  };

  const [editingPasswordUser, setEditingPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setPassError("La nueva contraseña no puede estar vacía.");
      return;
    }
    if (newPassword.length < 6) {
      setPassError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      setSavingPass(true);
      setPassError("");
      setPassSuccess("");
      const response = await fetch(`/api/auth/users/${editingPasswordUser.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ contrasenia: newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setPassSuccess(`Contraseña cambiada con éxito para "${editingPasswordUser.usuario}".`);
        setNewPassword("");
        setTimeout(() => {
          setEditingPasswordUser(null);
          setPassSuccess("");
        }, 1500);
      } else {
        setPassError(data.error || "No se pudo actualizar la contraseña.");
      }
    } catch (err) {
      setPassError("Error al intentar cambiar la contraseña.");
    } finally {
      setSavingPass(false);
    }
  };

  const generateServerBackup = async () => {
    try {
      setImportStatus("Generando copia de seguridad física en el servidor...");
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setImportStatus(`¡Copia de seguridad física creada con éxito! Carpeta en el servidor: ${data.folder}`);
        setTimeout(() => setImportStatus(""), 6000);
      } else {
        setImportStatus(`Error al generar copia: ${data.error || "No autorizado o error del servidor."}`);
        setTimeout(() => setImportStatus(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setImportStatus("Error de conexión al generar copia de seguridad.");
      setTimeout(() => setImportStatus(""), 4000);
    }
  };

  const isInvitado = currentUser?.rol === "Invitado";

  // Compute Dashboard Statistics (Fase 4)
  const stats = useMemo(() => {
    const resourcesByArea = {};
    AREAS_CNEB.forEach(area => {
      resourcesByArea[area] = recursos.filter(r => r.area === area).length;
    });

    const tutorialesDocente = tutoriales.filter(p => p.audiencia === "docente" || p.audiencia === "ambos").length;
    const tutorialesEstudiante = tutoriales.filter(p => p.audiencia === "estudiante" || p.audiencia === "ambos").length;

    return {
      totalRecursos: recursos.length,
      resourcesByArea,
      totalTutoriales: tutoriales.length,
      tutorialesDocente,
      tutorialesEstudiante,
      totalNoticias: noticias.length
    };
  }, [recursos, tutoriales, noticias]);

  if (isInvitado) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl shadow-lg text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto text-lg">
          <i className="fas fa-lock"></i>
        </div>
        <h3 className="font-bold text-base text-gray-950 dark:text-white uppercase">Acceso Restringido</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
          Los usuarios invitados solo pueden visualizar contenido.
        </p>
      </div>
    );
  }

  const handleOpenAdd = (type) => {
    setModalType(type);
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      const res = await importData(content);
      if (res.success) {
        setImportStatus("¡Datos importados con éxito!");
        setTimeout(() => setImportStatus(""), 3000);
      } else {
        setImportStatus(`Error al importar: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };

  const exportResourcesToCSV = () => {
    const headers = ["ID", "Titulo", "Area Curricular", "Grados", "Tipo", "Descripcion", "URL"];
    const rows = recursos.map(r => [
      r.id,
      `"${r.titulo.replace(/"/g, '""')}"`,
      `"${r.area.replace(/"/g, '""')}"`,
      `"${r.grados.join(", ")}"`,
      `"${r.tipo}"`,
      `"${r.desc.replace(/"/g, '""')}"`,
      `"${r.url}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `InnovaBandera_Recursos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTutorialesToCSV = () => {
    const headers = ["ID", "Titulo", "Area Curricular", "Descripcion", "URL YouTube", "Audiencia"];
    const rows = tutoriales.map(p => [
      p.id,
      `"${p.titulo.replace(/"/g, '""')}"`,
      `"${p.area.replace(/"/g, '""')}"`,
      `"${p.desc.replace(/"/g, '""')}"`,
      `"${p.url || ""}"`,
      `"${p.audiencia || "ambos"}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `InnovaBandera_Tutoriales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 text-left">
      {/* Management Toolbar */}
      <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase tracking-tight">
            Panel de Administración
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Gestión en tiempo real de recursos, tutoriales y comunicados (los archivos y datos se guardan en el servidor local).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2">
          {/* Physical Server Backup */}
          <button
            onClick={generateServerBackup}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Generar copia física de base de datos y archivos en el servidor"
          >
            <i className="fas fa-hdd text-[11px]"></i> Backup Servidor (DB+Archivos)
          </button>

          {/* Export JSON Backup */}
          <button
            onClick={exportData}
            className="px-4 py-2 border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <i className="fas fa-download text-[11px] text-primary dark:text-dark-accent"></i> Exportar JSON
          </button>

          {/* Import JSON Backup */}
          <label className="px-4 py-2 border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm">
            <i className="fas fa-upload text-[11px] text-amber-500"></i> Importar Datos
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold text-center animate-pulse">
          {importStatus}
        </div>
      )}

      {/* DASHBOARD STATISTICS WIDGET (Fase 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recursos Card */}
        <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm transition-colors flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
            <i className="fas fa-book"></i>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Recursos</h4>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.totalRecursos}</div>
          </div>
        </div>

        {/* Total Tutoriales Card */}
        <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm transition-colors flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center text-lg">
            <i className="fab fa-youtube"></i>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Tutoriales</h4>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
              {stats.totalTutoriales}
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold ml-1.5">({stats.tutorialesDocente} doc. / {stats.tutorialesEstudiante} est.)</span>
            </div>
          </div>
        </div>

        {/* Total Comunicados Card */}
        <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm transition-colors flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg">
            <i className="fas fa-bullhorn"></i>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Comunicados</h4>
            <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.totalNoticias}</div>
          </div>
        </div>

        {/* CSV Export Card */}
        <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm transition-colors flex flex-col justify-center gap-1.5">
          <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block">Descargas Curriculares</h4>
          <div className="flex gap-1.5 mt-1">
            <button
              onClick={exportResourcesToCSV}
              className="flex-1 py-1 px-2.5 bg-gray-50 dark:bg-dark-border hover:bg-primary dark:hover:bg-dark-accent hover:text-white text-gray-600 dark:text-gray-300 rounded-lg text-[9px] font-bold uppercase transition-colors flex items-center justify-center gap-1 border border-gray-150 dark:border-dark-border cursor-pointer"
              title="Descargar recursos en formato CSV"
            >
              <i className="fas fa-file-csv"></i> Recursos
            </button>
            <button
              onClick={exportTutorialesToCSV}
              className="flex-1 py-1 px-2.5 bg-gray-50 dark:bg-dark-border hover:bg-primary dark:hover:bg-dark-accent hover:text-white text-gray-600 dark:text-gray-300 rounded-lg text-[9px] font-bold uppercase transition-colors flex items-center justify-center gap-1 border border-gray-150 dark:border-dark-border cursor-pointer"
              title="Descargar tutoriales en formato CSV"
            >
              <i className="fas fa-file-csv"></i> Tutoriales
            </button>
          </div>
        </div>
      </div>

      {/* Tabs list inside Panel */}
      <div className="flex border-b border-gray-200 dark:border-dark-border">
        <button
          onClick={() => setActiveSubTab("recursos")}
          className={`pb-3 px-4 font-black uppercase text-xs tracking-wider transition-all border-b-2 -mb-px cursor-pointer ${activeSubTab === "recursos"
            ? "border-primary dark:border-dark-accent text-primary dark:text-dark-accent-text"
            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
        >
          <i className="fas fa-book mr-1.5"></i> Recursos
        </button>
        <button
          onClick={() => setActiveSubTab("tutoriales")}
          className={`pb-3 px-4 font-black uppercase text-xs tracking-wider transition-all border-b-2 -mb-px cursor-pointer ${activeSubTab === "tutoriales"
            ? "border-primary dark:border-dark-accent text-primary dark:text-dark-accent-text"
            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
        >
          <i className="fab fa-youtube mr-1.5"></i> Tutoriales
        </button>
        <button
          onClick={() => setActiveSubTab("noticias")}
          className={`pb-3 px-4 font-black uppercase text-xs tracking-wider transition-all border-b-2 -mb-px cursor-pointer ${activeSubTab === "noticias"
            ? "border-primary dark:border-dark-accent text-primary dark:text-dark-accent-text"
            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
        >
          <i className="fas fa-bullhorn mr-1.5"></i> Comunicados
        </button>
        <button
          onClick={() => setActiveSubTab("usuarios")}
          className={`pb-3 px-4 font-black uppercase text-xs tracking-wider transition-all border-b-2 -mb-px cursor-pointer ${activeSubTab === "usuarios"
            ? "border-primary dark:border-dark-accent text-primary dark:text-dark-accent-text"
            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
        >
          <i className="fas fa-users mr-1.5"></i> Usuarios
        </button>
        {currentUser?.rol === "Administrador" && (
          <button
            onClick={() => setActiveSubTab("auditoria")}
            className={`pb-3 px-4 font-black uppercase text-xs tracking-wider transition-all border-b-2 -mb-px cursor-pointer ${activeSubTab === "auditoria"
              ? "border-primary dark:border-dark-accent text-primary dark:text-dark-accent-text"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
          >
            <i className="fas fa-shield-alt mr-1.5"></i> Auditoría
          </button>
        )}
      </div>

      {/* Adding buttons */}
      {activeSubTab !== "usuarios" && activeSubTab !== "auditoria" && (
        <div className="flex justify-end">
          <button
            onClick={() => handleOpenAdd(activeSubTab)}
            className="px-5 py-2.5 bg-primary dark:bg-dark-accent hover:bg-blue-850 dark:hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <i className="fas fa-plus-circle text-[13px]"></i> Nuevo Elemento
          </button>
        </div>
      )}

      {/* Render Lists with Admin controls */}
      <div>
        {activeSubTab === "recursos" && (
          <Repositorio
            isAdminMode={true}
            onEditClick={(item) => handleOpenEdit("recursos", item)}
          />
        )}
        {activeSubTab === "tutoriales" && (
          <Tutoriales
            isAdminMode={true}
            onEditClick={(item) => handleOpenEdit("tutoriales", item)}
            onDeleteClick={(id) => { if (window.confirm("¿Eliminar este tutorial?")) deleteTutorial(id); }}
          />
        )}
        {activeSubTab === "noticias" && (
          <Noticias
            isAdminMode={true}
            onEditClick={(item) => handleOpenEdit("noticias", item)}
          />
        )}
        {activeSubTab === "auditoria" && <AuditoriaPanel />}
        {activeSubTab === "usuarios" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-1 bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-6 shadow-sm h-fit">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <i className="fas fa-user-plus text-primary dark:text-dark-accent"></i>
                Crear Nuevo Docente
              </h3>

              {userError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <i className="fas fa-exclamation-circle flex-shrink-0"></i>
                  <span>{userError}</span>
                </div>
              )}

              {userSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-250 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <i className="fas fa-check-circle flex-shrink-0"></i>
                  <span>{userSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                    Usuario
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. jperez"
                    className="w-full px-3.5 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent"
                    value={formUsuario}
                    onChange={(e) => setFormUsuario(e.target.value.toLowerCase().trim())}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-3.5 pr-10 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent"
                      value={formContrasenia}
                      onChange={(e) => setFormContrasenia(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                    >
                      <i className={`fas ${showPass ? "fa-eye-slash" : "fa-eye"} text-xs`}></i>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                    Rol Asignado
                  </label>
                  <div className="w-full px-3.5 py-2 border border-gray-150 dark:border-dark-border bg-gray-50 dark:bg-dark-border/40 rounded-xl text-xs text-gray-500 dark:text-gray-400 font-bold flex items-center gap-2">
                    <i className="fas fa-graduation-cap"></i>
                    Docente
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingUser}
                  className="w-full py-2.5 bg-gradient-to-r from-primary to-blue-700 dark:from-dark-accent dark:to-blue-600 hover:from-blue-800 hover:to-primary text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {creatingUser ? (
                    <><i className="fas fa-spinner fa-spin"></i> Registrando...</>
                  ) : (
                    <><i className="fas fa-plus-circle"></i> Registrar Docente</>
                  )}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-150 dark:border-dark-border"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">o</span>
                  <div className="flex-grow border-t border-gray-150 dark:border-dark-border"></div>
                </div>

                <input
                  type="file"
                  ref={excelInputRef}
                  onChange={handleExcelUpload}
                  accept=".xlsx, .csv"
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={importingExcel}
                  onClick={() => excelInputRef.current?.click()}
                  className="w-full py-2.5 bg-white dark:bg-dark-card border border-gray-250 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border/20 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {importingExcel ? (
                    <><i className="fas fa-spinner fa-spin text-primary dark:text-dark-accent"></i> Procesando...</>
                  ) : (
                    <><i className="fas fa-file-excel text-emerald-600"></i> Importar desde Excel</>
                  )}
                </button>
              </form>
            </div>

            {/* List Column */}
            <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <i className="fas fa-users text-primary dark:text-dark-accent"></i>
                Docentes y Usuarios Registrados
              </h3>

              {loadingUsers ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Cargando usuarios...
                </div>
              ) : usuarios.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-dark-border text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                        <th className="pb-3 pl-2">Nombre</th>
                        <th className="pb-3">Usuario</th>
                        <th className="pb-3">Rol</th>
                        <th className="pb-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-xs">
                      {usuarios.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-border/20 transition-colors">
                          <td className="py-3 pl-2 font-bold text-gray-800 dark:text-gray-200">
                            {user.nombre}
                          </td>
                          <td className="py-3 font-semibold text-gray-500 dark:text-gray-400">
                            {user.usuario}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${user.rol === "Administrador"
                                ? "bg-amber-500 text-white"
                                : user.rol === "Docente"
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-400 text-white"
                              }`}>
                              {user.rol}
                            </span>
                          </td>
                          <td className="py-3 text-center flex items-center justify-center gap-1.5">
                            {user.rol !== "Administrador" && (
                              <button
                                onClick={() => setEditingPasswordUser(user)}
                                className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors cursor-pointer"
                                title="Cambiar Contraseña"
                              >
                                <i className="fas fa-key text-[10px]"></i>
                              </button>
                            )}
                            {user.usuario !== currentUser?.usuario && user.usuario !== "admin" ? (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.usuario)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-300 dark:text-gray-600 font-semibold italic">
                                Fijo
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  No hay usuarios registrados.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para ver datos y editar contraseña */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card border border-gray-250 dark:border-dark-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
            {/* Top decorative bar */}
            <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>

            <div className="p-6 relative">
              <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <i className="fas fa-user-cog text-amber-500"></i>
                Detalles del Usuario y Contraseña
              </h3>

              {passError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <i className="fas fa-exclamation-circle flex-shrink-0"></i>
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-250 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <i className="fas fa-check-circle flex-shrink-0"></i>
                  <span>{passSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Info Fields (Read Only) */}
                <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-dark-border/30 p-3.5 rounded-xl border border-gray-150 dark:border-dark-border">
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 block">Nombre Completo</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate block">{editingPasswordUser.nombre}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 block">Usuario</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate block">@{editingPasswordUser.usuario}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 block">Rol</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">{editingPasswordUser.rol}</span>
                  </div>
                </div>

                {/* Change Password Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2 border-t border-gray-150 dark:border-dark-border">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-450 dark:text-gray-500 tracking-wider">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        required
                        autoFocus
                        placeholder="Cambiar a una nueva (mínimo 6 caracteres)"
                        className="w-full pl-3.5 pr-10 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent transition-all"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                      >
                        <i className={`fas ${showNewPass ? "fa-eye-slash" : "fa-eye"} text-xs`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPasswordUser(null);
                        setNewPassword("");
                        setPassError("");
                        setPassSuccess("");
                        setShowPass(false);
                        setShowNewPass(false);
                      }}
                      className="flex-1 py-2 bg-gray-50 dark:bg-dark-border border border-gray-250 dark:border-dark-border text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold uppercase hover:bg-gray-100 dark:hover:bg-dark-hover transition-all cursor-pointer animate-none"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      disabled={savingPass}
                      className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {savingPass ? (
                        <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
                      ) : (
                        <><i className="fas fa-save"></i> Guardar</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Unified Modal for CMS actions (replaces duplicate modals) */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        editingItem={editingItem}
      />
    </div>
  );
}