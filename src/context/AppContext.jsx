import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE } from "../utils/api.js";

const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [recursos, setRecursos] = useState([]);
  const [tutoriales, setTutoriales] = useState([]);
  const [noticias, setNoticias] = useState([]);

  // Client-specific settings kept in local browser
  const [favoritos, setFavoritos] = useState(() => {
    const local = localStorage.getItem("innova_favoritos");
    return local ? JSON.parse(local) : [];
  });

  const [darkMode, setDarkMode] = useState(() => {
    const local = localStorage.getItem("innova_dark_mode");
    return local === "true";
  });

  // --- SESSION AUTH STATES ---
  const [token, setToken] = useState(() => {
    return localStorage.getItem("innova_token") || null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const local = localStorage.getItem("innova_user");
    return local ? JSON.parse(local) : null;
  });

  const [tutorialAccess, setTutorialAccess] = useState(null);

  // --- SYNC LOCAL CLIENT CONFIG ---
  useEffect(() => {
    localStorage.setItem("innova_favoritos", JSON.stringify(favoritos));
  }, [favoritos]);

  useEffect(() => {
    localStorage.setItem("innova_dark_mode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // --- FETCH CENTRAL DATABASE FROM EXPRESS API (con reintentos) ---
  const loadDatabase = async ({ retries = 5, delayMs = 1500 } = {}) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const [resRec, resTut, resNot] = await Promise.all([
          fetch(`${API_BASE}/api/recursos`),
          fetch(`${API_BASE}/api/tutoriales`),
          fetch(`${API_BASE}/api/noticias`),
        ]);

        // Si el servidor aún no está listo (503) reintentamos
        if (resRec.status === 503 || resTut.status === 503 || resNot.status === 503) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, delayMs * attempt));
            continue;
          }
          return; // Se agotaron reintentos, quedamos con arrays vacíos
        }

        const [rec, tut, not] = await Promise.all([
          resRec.ok ? resRec.json() : [],
          resTut.ok ? resTut.json() : [],
          resNot.ok ? resNot.json() : [],
        ]);

        setRecursos(rec);
        setTutoriales(tut);
        setNoticias(not);
        return; // éxito
      } catch {
        // ECONNREFUSED u otro error de red — reintentamos
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
      }
    }
  };

  // Cargar la base de datos al montar el componente o al cambiar el token de autenticación
  useEffect(() => {
    loadDatabase();
  }, [token]);


  // --- AUTHENTICATION METHODS ---
  const login = async (usuario, contrasenia) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasenia })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("innova_token", data.token);
        localStorage.setItem("innova_user", JSON.stringify(data.user));

        setToken(data.token);
        setCurrentUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Fallo al iniciar sesión." };
      }
    } catch (_err) {
      console.error("Login error:", _err);
      return { success: false, error: "Error de servidor en inicio de sesión." };
    }
  };

  const register = async (nombre, usuario, contrasenia, rol) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ nombre, usuario, contrasenia, rol })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || "Fallo en el registro." };
      }
    } catch (_err) {
      console.error("Register error:", _err);
      return { success: false, error: "Error de servidor en el registro." };
    }
  };

  const logout = () => {
    localStorage.removeItem("innova_token");
    localStorage.removeItem("innova_user");
    setToken(null);
    setCurrentUser(null);
  };

  // --- AUTO-LOGOUT ON INACTIVITY (15 min) ---
  useEffect(() => {
    if (!token) return;
    let timeoutId;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        alert("Tu sesión ha expirado por inactividad. Por favor, inicia sesión de nuevo.");
      }, 15 * 60 * 1000);
    };
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [token]);

  // Helper auth headers
  const getAuthHeaders = () => {
    const activeToken = token || localStorage.getItem("innova_token");
    return {
      "Content-Type": "application/json",
      ...(activeToken ? { "Authorization": `Bearer ${activeToken}` } : {})
    };
  };

  // Interceptor para peticiones no autorizadas
  const handleApiResponse = async (response) => {
    if (response.status === 401 || response.status === 403) {
      logout();
      alert("Tu sesión ha expirado o no tienes permisos para esta acción. Por favor, inicia sesión de nuevo.");
      return false;
    }
    return true;
  };

  // --- CRUD ACTIONS FOR RECURSOS ---
  const addRecurso = async (item) => {
    try {
      const response = await fetch(`${API_BASE}/api/recursos`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(item),
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          const newItem = await response.json();
          setRecursos((prev) => [newItem, ...prev]);
        }
      }
    } catch (_err) {
      console.error("Error al agregar recurso:", _err);
    }
  };

  const updateRecurso = async (id, updatedItem) => {
    try {
      const response = await fetch(`${API_BASE}/api/recursos/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedItem),
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setRecursos((prev) =>
            prev.map((item) => (String(item.id) === String(id) ? { ...updatedItem, id } : item))
          );
        }
      }
    } catch (_err) {
      console.error("Error al editar recurso:", _err);
    }
  };

  const deleteRecurso = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/recursos/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setRecursos((prev) => prev.filter((item) => String(item.id) !== String(id)));
          setFavoritos((prev) => prev.filter((favId) => String(favId) !== String(id)));
        }
      }
    } catch (_err) {
      console.error("Error al eliminar recurso:", _err);
    }
  };

  const toggleFavorito = (id) => {
    setFavoritos((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    );
  };

  // --- CRUD ACTIONS FOR TUTORIALES ---
  const addTutorial = async (item) => {
    try {
      const response = await fetch(`${API_BASE}/api/tutoriales`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(item),
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          const newItem = await response.json();
          setTutoriales((prev) => [newItem, ...prev]);
        }
      }
    } catch (_err) {
      console.error("Error al agregar tutorial:", _err);
    }
  };

  const updateTutorial = async (id, updatedItem) => {
    try {
      const response = await fetch(`${API_BASE}/api/tutoriales/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedItem),
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setTutoriales((prev) =>
            prev.map((item) => (String(item.id) === String(id) ? { ...updatedItem, id } : item))
          );
        }
      }
    } catch (_err) {
      console.error("Error al editar tutorial:", _err);
    }
  };

  const deleteTutorial = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/tutoriales/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setTutoriales((prev) => prev.filter((item) => String(item.id) !== String(id)));
        }
      }
    } catch (_err) {
      console.error("Error al eliminar tutorial:", _err);
    }
  };

  // --- CRUD ACTIONS FOR NOTICIAS ---
  const addNoticia = async (item) => {
    try {
      const response = await fetch(`${API_BASE}/api/noticias`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(item),
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          const newItem = await response.json();
          setNoticias((prev) => [newItem, ...prev]);
        }
      }
    } catch (_err) {
      console.error("Error al publicar comunicado:", _err);
    }
  };

  const updateNoticia = async (id, updatedItem) => {
    try {
      const response = await fetch(`${API_BASE}/api/noticias/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedItem),
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setNoticias((prev) =>
            prev.map((item) => (String(item.id) === String(id) ? { ...updatedItem, id } : item))
          );
        }
      }
    } catch (_err) {
      console.error("Error al editar comunicado:", _err);
    }
  };

  const deleteNoticia = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/noticias/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setNoticias((prev) => prev.filter((item) => String(item.id) !== String(id)));
        }
      }
    } catch (_err) {
      console.error("Error al eliminar comunicado:", _err);
    }
  };

  // --- EXPORT AND IMPORT DATABASE ---
  const exportData = () => {
    const data = { recursos, tutoriales, noticias };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `InnovaBandera_Respaldo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = async (jsonData) => {
    try {
      const parsed = JSON.parse(jsonData);
      const response = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(parsed),
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          await loadDatabase();
          return { success: true };
        }
      }
      return { success: false, error: "Fallo en el servidor al procesar la base de datos." };
    } catch (_err) {
      console.error("Error al importar datos:", _err);
      return { success: false, error: _err.message };
    }
  };

  return (
    <AppContext.Provider
      value={{
        recursos,
        tutoriales,
        noticias,
        favoritos,
        darkMode,
        setDarkMode,
        token,
        currentUser,
        login,
        register,
        logout,
        addRecurso,
        updateRecurso,
        deleteRecurso,
        toggleFavorito,
        addTutorial,
        updateTutorial,
        deleteTutorial,
        addNoticia,
        updateNoticia,
        deleteNoticia,
        exportData,
        importData,
        tutorialAccess,
        setTutorialAccess,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp debe usarse dentro de un AppContextProvider");
  }
  return context;
}