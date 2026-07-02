import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useApp } from "../context/AppContext";

const ACCION_COLORS = {
  LOGIN_EXITOSO: "#22c55e",
  LOGIN_FALLIDO: "#ef4444",
  LOGOUT: "#6b7280",
  USUARIO_CREADO: "#3b82f6",
  USUARIO_ELIMINADO: "#f97316",
  CONTRASENA_ACTUALIZADA: "#eab308",
  RECURSO_CREADO: "#8b5cf6",
  RECURSO_ACTUALIZADO: "#06b6d4",
  RECURSO_ELIMINADO: "#ec4899",
  TUTORIAL_CREADO: "#10b981",
  TUTORIAL_ACTUALIZADO: "#14b8a6",
  TUTORIAL_ELIMINADO: "#f43f5e",
  NOTICIA_CREADA: "#a855f7",
  NOTICIA_ACTUALIZADA: "#64748b",
  NOTICIA_ELIMINADA: "#dc2626",
  USUARIOS_CARGA_MASIVA: "#0ea5e9",
  AUDITORIA_EXPORTADA: "#84cc16",
};

const PIE_FALLBACK = "#94a3b8";

const ACCIONES_LISTA = Object.keys(ACCION_COLORS);

function Badge({ exito }) {
  return exito ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
      <i className="fas fa-check" /> OK
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">
      <i className="fas fa-times" /> Fallo
    </span>
  );
}

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-black text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      <p className="text-primary dark:text-dark-accent font-bold">{payload[0].value} eventos</p>
    </div>
  );
};

export default function AuditoriaPanel() {
  const { token } = useApp();

  // Stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Table state
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Filters
  const [filtroAccion, setFiltroAccion] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroExito, setFiltroExito] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  // Export
  const [exporting, setExporting] = useState(false);

  const buildParams = useCallback(
    (extra = {}) => {
      const p = new URLSearchParams();
      if (filtroAccion) p.set("accion", filtroAccion);
      if (filtroUsuario) p.set("usuario", filtroUsuario);
      if (filtroExito !== "") p.set("exito", filtroExito);
      if (filtroDesde) p.set("desde", filtroDesde);
      if (filtroHasta) p.set("hasta", filtroHasta);
      Object.entries(extra).forEach(([k, v]) => p.set(k, v));
      return p.toString();
    },
    [filtroAccion, filtroUsuario, filtroExito, filtroDesde, filtroHasta]
  );

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const qs = new URLSearchParams();
      if (filtroDesde) qs.set("desde", filtroDesde);
      if (filtroHasta) qs.set("hasta", filtroHasta);
      const res = await fetch(`/api/admin/auditoria/stats?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  }, [token, filtroDesde, filtroHasta]);

  const fetchLogs = useCallback(
    async (p = 1) => {
      setLoadingLogs(true);
      try {
        const qs = buildParams({ page: p, limit: 50 });
        const res = await fetch(`/api/admin/auditoria?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.data);
          setTotal(data.total);
          setPages(data.pages);
          setPage(data.page);
        }
      } finally {
        setLoadingLogs(false);
      }
    },
    [token, buildParams]
  );

  useEffect(() => {
    fetchStats();
    fetchLogs(1);
  }, [fetchStats, fetchLogs]);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchStats();
    fetchLogs(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const qs = buildParams();
      const res = await fetch(`/api/admin/auditoria/export-csv?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_err) {
      alert("No se pudo exportar: " + _err.message);
    } finally {
      setExporting(false);
    }
  };

  // Prepare Recharts data
  const barData = stats
    ? stats.porAccion.map((r) => ({ name: r.accion, total: Number(r.total) }))
    : [];

  const pieData = stats
    ? [
        { name: "Exitosos", value: stats.exitosos },
        { name: "Fallidos", value: stats.fallidos },
      ]
    : [];

  const PIE_COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <i className="fas fa-shield-alt text-primary dark:text-dark-accent" />
            Panel de Auditoría
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Registro completo de acciones y eventos del sistema.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {exporting ? (
            <><i className="fas fa-spinner fa-spin" /> Exportando...</>
          ) : (
            <><i className="fas fa-file-csv" /> Exportar CSV</>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="py-6 text-center text-xs text-gray-400">
          <i className="fas fa-spinner fa-spin mr-2" />Cargando estadísticas...
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
              <i className="fas fa-list-alt" />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Eventos</h4>
              <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.total.toLocaleString()}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
              <i className="fas fa-check-circle" />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Exitosos</h4>
              <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.exitosos.toLocaleString()}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center text-lg">
              <i className="fas fa-times-circle" />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Fallidos</h4>
              <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.fallidos.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && (barData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart: events by action */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm">
            <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-4">
              Eventos por Acción
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 8, fill: "#94a3b8" }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltipBar />} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={ACCION_COLORS[entry.name] || PIE_FALLBACK}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart: exitosos vs fallidos */}
          <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center">
            <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-4 self-start">
              Éxito vs Fallo
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px", fontWeight: 700 }}
                />
                <Tooltip formatter={(v) => [`${v} eventos`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <form
        onSubmit={handleFilter}
        className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl p-5 shadow-sm"
      >
        <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-3">
          Filtros
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="col-span-2 md:col-span-1 px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent"
          >
            <option value="">Todas las acciones</option>
            {ACCIONES_LISTA.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Usuario"
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent"
          />
          <select
            value={filtroExito}
            onChange={(e) => setFiltroExito(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent"
          >
            <option value="">Todos</option>
            <option value="true">Exitosos</option>
            <option value="false">Fallidos</option>
          </select>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent"
          />
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-accent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary dark:bg-dark-accent hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <i className="fas fa-search" /> Filtrar
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-dark-card border border-gray-150 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
            Registros ({total.toLocaleString()})
          </h4>
          {pages > 1 && (
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
              <button
                disabled={page <= 1}
                onClick={() => fetchLogs(page - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border disabled:opacity-40 transition-colors cursor-pointer"
              >
                <i className="fas fa-chevron-left text-[10px]" />
              </button>
              <span>{page} / {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => fetchLogs(page + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border disabled:opacity-40 transition-colors cursor-pointer"
              >
                <i className="fas fa-chevron-right text-[10px]" />
              </button>
            </div>
          )}
        </div>

        {loadingLogs ? (
          <div className="py-12 text-center text-xs text-gray-400">
            <i className="fas fa-spinner fa-spin mr-2" />Cargando registros...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            No hay registros de auditoría con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-2">Acción</th>
                  <th className="py-3 px-2">Usuario</th>
                  <th className="py-3 px-2">Rol</th>
                  <th className="py-3 px-2">Entidad</th>
                  <th className="py-3 px-2 max-w-[200px]">Detalle</th>
                  <th className="py-3 px-2">IP</th>
                  <th className="py-3 px-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-border text-xs">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-dark-border/10 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono text-[10px]">
                      {new Date(log.createdAt).toLocaleString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white"
                        style={{ backgroundColor: ACCION_COLORS[log.accion] || PIE_FALLBACK }}
                      >
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {log.usuario || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {log.rol || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {log.entidad ? (
                        <span>
                          {log.entidad}
                          {log.entidadId ? <span className="text-gray-300 dark:text-gray-600 ml-1">#{log.entidadId}</span> : null}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={log.detalle}>
                      {log.detalle || "—"}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {log.ip || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Badge exito={log.exito} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => fetchLogs(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  p === page
                    ? "bg-primary dark:bg-dark-accent text-white"
                    : "bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-border"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
