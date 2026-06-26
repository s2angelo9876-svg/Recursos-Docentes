import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppContextProvider, useApp } from "./context/AppContext";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Repositorio from "./components/Repositorio";
import Tutoriales from "./components/Tutoriales";
import Noticias from "./components/Noticias";
import AdminPanel from "./components/AdminPanel";
import Login from "./components/Login";
import AdminModal from "./components/AdminModal";

function MaintenanceView({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="relative bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border w-full max-w-lg rounded-3xl shadow-2xl p-8 overflow-hidden transition-colors">
        {/* Glow sphere */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-lg mb-6 ring-4 ring-amber-500/20">
          <i className="fas fa-tools animate-bounce"></i>
        </div>

        <h2 className="text-xl font-black uppercase text-gray-900 dark:text-white tracking-tight">
          {title}
        </h2>
        <h3 className="text-sm font-bold text-amber-500 dark:text-amber-400 mt-2 uppercase tracking-wide">
          Sección en Construcción o Mantenimiento
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 leading-relaxed font-semibold max-w-md mx-auto">
          Estamos trabajando para mejorar tu experiencia. Esta sección estará disponible próximamente para todos los usuarios.
        </p>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-dark-border border border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-gray-400 font-bold">
            <i className="fas fa-info-circle text-amber-500"></i>
            Acceso restringido temporalmente
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { currentUser, deleteRecurso, deleteTutorial, deleteNoticia } = useApp();
  const isAdmin = currentUser?.rol === "Administrador";
  const isDocente = currentUser?.rol === "Docente";
  const canEditRecursosTutoriales = isAdmin || isDocente;

  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (path) => {
    if (path === "/" || path === "/portada") return "portada";
    if (path.startsWith("/recursos")) return "recursos";
    if (path.startsWith("/evidencias")) return "evidencias";
    if (path.startsWith("/tutoriales") || path.startsWith("/proyectos")) return "tutoriales";
    if (path.startsWith("/noticias")) return "noticias";
    if (path.startsWith("/admin")) return "admin";
    if (path.startsWith("/login")) return "login";
    return "portada";
  };

  const tab = getTabFromPath(location.pathname);

  const setActiveTab = (tabKey) => {
    if (tabKey === "portada") navigate("/");
    else navigate(`/${tabKey}`);
  };

  // ── CMS Modal state (shared across all views) ──────────
  const [cmsModal, setCmsModal] = useState({ open: false, type: "recursos", item: null });

  const openCmsAdd = (type) => setCmsModal({ open: true, type, item: null });
  const openCmsEdit = (type, item) => setCmsModal({ open: true, type, item });
  const closeCms = () => setCmsModal({ open: false, type: "recursos", item: null });

  const canAddInSection = (cmsType) => {
    if (cmsType === "noticias") return isAdmin;
    if (cmsType === "recursos" || cmsType === "tutoriales") return canEditRecursosTutoriales;
    return false;
  };

  // ── Section header with optional CMS add button ────────
  const SectionHeader = ({ icon, iconColor, title, cmsType }) => (
    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-dark-border">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center`}>
          <i className={`${icon} text-[14px]`}></i>
        </div>
        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">{title}</h2>
      </div>
      {canAddInSection(cmsType) && cmsType && (
        <button
          onClick={() => openCmsAdd(cmsType)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary dark:bg-dark-accent hover:bg-blue-800 dark:hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
        >
          <i className="fas fa-plus-circle text-[11px]"></i> Nuevo
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-dark-bg text-gray-900 dark:text-gray-100 antialiased flex flex-col justify-between transition-colors duration-300">

      {/* Navigation Header */}
      <Header activeTab={tab} setActiveTab={setActiveTab} />

      {/* Admin / Docente edit banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-1.5 px-4 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
          <i className="fas fa-shield-alt animate-pulse"></i>
          MODO ADMINISTRADOR ACTIVO — Puedes editar cualquier contenido directamente
          <i className="fas fa-shield-alt animate-pulse"></i>
        </div>
      )}
      {isDocente && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-1.5 px-4 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
          <i className="fas fa-pen animate-pulse"></i>
          MODO EDICIÓN DOCENTE — Puedes gestionar recursos y tutoriales
          <i className="fas fa-pen animate-pulse"></i>
        </div>
      )}

      {/* Dynamic Content Main area */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-grow">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <motion.div key="portada" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                <Hero setActiveTab={setActiveTab} />
              </motion.div>
            } />
            <Route path="/portada" element={<Navigate to="/" replace />} />

            <Route path="/login" element={
              currentUser ? <Navigate to="/" replace /> : (
                <motion.div key="login" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                  <Login onLoginSuccess={() => navigate("/")} />
                </motion.div>
              )
            } />

            <Route path="/recursos" element={
              !currentUser ? (
                <motion.div key="recursos-login" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                  <Login onLoginSuccess={() => navigate("/recursos")} />
                </motion.div>
              ) : (
                <motion.div key="recursos" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="space-y-6 text-left">
                  <SectionHeader
                    icon="fas fa-book"
                    iconColor="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                    title="Recursos Pedagógicos"
                  />
                  <Repositorio isAdminMode={false} />
                </motion.div>
              )
            } />

            <Route path="/evidencias" element={
              isAdmin ? (
                <motion.div key="evidencias" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                  <MaintenanceView title="Evidencias por Mes" />
                </motion.div>
              ) : (
                <motion.div key="evidencias-maint" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                  <MaintenanceView title="Evidencias por Mes" />
                </motion.div>
              )
            } />

            <Route path="/tutoriales" element={
              <motion.div key="tutoriales" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="space-y-6 text-left">
                <SectionHeader
                  icon="fab fa-youtube"
                  iconColor="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                  title="Tutoriales TIC"
                  cmsType="tutoriales"
                />
                <Tutoriales
                  isAdminMode={canEditRecursosTutoriales}
                  onEditClick={(item) => openCmsEdit("tutoriales", item)}
                  onDeleteClick={(id) => { if (window.confirm("¿Eliminar este tutorial?")) deleteTutorial(id); }}
                />
              </motion.div>
            } />

            <Route path="/proyectos" element={<Navigate to="/tutoriales" replace />} />

            <Route path="/noticias" element={
              isAdmin ? (
                <motion.div key="noticias" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="space-y-6 text-left">
                  <SectionHeader
                    icon="fas fa-bullhorn"
                    iconColor="bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
                    title="Comunicados y Talleres TIC"
                  />
                  <Noticias isAdminMode={false} />
                </motion.div>
              ) : (
                <motion.div key="noticias-maint" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                  <MaintenanceView title="Comunicados y Talleres TIC" />
                </motion.div>
              )
            } />

            <Route path="/admin" element={
              <motion.div key="admin" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                {currentUser ? (
                  currentUser.rol === "Administrador" ? (
                    <AdminPanel />
                  ) : (
                    <Navigate to="/" replace />
                  )
                ) : (
                  <Login onLoginSuccess={() => navigate("/admin")} />
                )}
              </motion.div>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* CMS Modal — shared across all views */}
      <AdminModal
        isOpen={cmsModal.open}
        onClose={closeCms}
        type={cmsModal.type}
        editingItem={cmsModal.item}
      />

      {/* Footer */}
      <footer className="py-6 border-t border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-500 dark:text-gray-400 font-semibold">
          © 2026 I.E. Bandera del Perú · Aula de Innovación Pedagógica · Prof. Luis Fajardo
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContextProvider>
        <AppContent />
      </AppContextProvider>
    </Router>
  );
}