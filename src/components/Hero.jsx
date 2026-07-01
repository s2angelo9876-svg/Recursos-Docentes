import React from "react";
import { useApp } from "../context/AppContext";
import { motion } from "framer-motion";

export default function Hero({ setActiveTab }) {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.rol === "Administrador";

  const quickCards = [
    {
      key: "recursos",
      icon: "fas fa-laptop-code",
      color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
      hoverColor: "group-hover:bg-primary group-hover:text-white",
      title: "Recursos Pedagógicos",
      desc: "Herramientas interactivas, simuladores y plataformas de gamificación.",
      action: "Explorar",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "evidencias",
      icon: "fas fa-images",
      color: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
      hoverColor: "group-hover:bg-primary group-hover:text-white",
      title: "Evidencias por Mes",
      desc: "Fotos y videos de marzo a diciembre.",
      action: "Ver",
      textColor: "text-green-600 dark:text-green-400",
    },
    {
      key: "noticias",
      icon: "fas fa-calendar-alt",
      color: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
      hoverColor: "group-hover:bg-primary group-hover:text-white",
      title: "Novedades y Talleres",
      desc: "Comunicados, y convocatorias a capacitación por parte del personal docente respecto a TIC.",
      action: "Leer Más",
      textColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-dark via-primary to-blue-900 dark:from-dark-bg dark:to-dark-card p-8 md:p-12 text-white shadow-2xl border border-blue-950/20 dark:border-dark-border"
      >
        {/* Animated Glow Effects */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-red-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-400/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-white/3 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight uppercase drop-shadow-lg">
            Bienvenidos a Innova Bandera
            <br />
            <span className="text-red-400 italic">2026</span>
          </h2>
          <p className="text-blue-100/75 dark:text-gray-400 text-sm md:text-base mb-8 font-medium max-w-lg mx-auto leading-relaxed">
            Repositorio de recursos tecnológicos, evidencias fotográficas y en video, tutoriales, noticias y experiencias exitosas. Dirigido a docentes y estudiantes.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveTab("recursos")}
              className="bg-white/10 hover:bg-red-600 text-white hover:text-white border border-white/30 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 shadow-lg shadow-black/20 active:scale-95 group"
            >
              Explorar Recursos
              <i className="fas fa-arrow-right group-hover:translate-x-1.5 transition-transform"></i>
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className="bg-amber-500/90 hover:bg-amber-400 text-white px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <i className="fas fa-cogs"></i> Panel Admin
              </button>
            )}
          </div>
        </div>

        {/* Abstract Icon Backdrop */}
        <div className="absolute -bottom-6 -right-6 p-4 opacity-[0.07] hidden md:block select-none pointer-events-none">
          <i className="fas fa-graduation-cap text-[220px]"></i>
        </div>

        {/* Admin badge */}
        {isAdmin && (
          <div className="absolute top-4 right-4 bg-amber-500/90 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md">
            <i className="fas fa-shield-alt"></i> Admin
          </div>
        )}
      </motion.div>

      {/* Quick Action Cards */}
      <div className="grid md:grid-cols-3 gap-5 pt-2">
        {quickCards.map(({ key, icon, color, hoverColor, title, desc, action, textColor }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            onClick={() => setActiveTab(key)}
            className="group cursor-pointer p-6 rounded-[20px] border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card hover:border-gray-250 dark:hover:border-gray-600 hover:shadow-xl transition-all shadow-sm text-left flex flex-col justify-between h-48 relative overflow-hidden"
          >
            {/* Subtle gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-50/50 dark:to-dark-border/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[20px]" />
            <div className="relative z-10">
              <div className={`h-10 w-10 rounded-xl ${color} ${hoverColor} flex items-center justify-center mb-4 transition-all shadow-sm group-hover:shadow-md group-hover:scale-110`}>
                <i className={`${icon} text-[16px]`}></i>
              </div>
              <h3 className="font-bold text-base mb-1 text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-dark-accent-text transition-colors">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{desc}</p>
            </div>
            <span className={`relative z-10 text-xs font-black ${textColor} group-hover:text-primary dark:group-hover:text-dark-accent-text flex items-center gap-1 transition-colors uppercase tracking-widest text-[10px]`}>
              {action} <i className="fas fa-chevron-right text-[8px] group-hover:translate-x-0.5 transition-transform"></i>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
