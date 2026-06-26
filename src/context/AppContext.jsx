import React, { createContext, useContext, useState, useEffect } from "react";

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

  // --- FETCH CENTRAL DATABASE FROM EXPRESS API ---
  const loadDatabase = async () => {
    try {
      const [resRec, resTut, resNot] = await Promise.all([
        fetch("/api/recursos").then((r) => r.ok ? r.json() : []),
        fetch("/api/tutoriales").then((r) => r.ok ? r.json() : []),
        fetch("/api/noticias").then((r) => r.ok ? r.json() : [])
      ]);
      setRecursos(resRec);
      setTutoriales(resTut);
      setNoticias(resNot);
    } catch (err) {
      console.error("Error al cargar la base de datos de la API local:", err);
    }
  };

  // Cargar la base de datos al montar el componente o al cambiar el token de autenticación
  useEffect(() => {
    loadDatabase();
  }, [token]);

  // --- AUTHENTICATION METHODS ---
  const login = async (usuario, contrasenia) => {
    try {
      const response = await fetch("/api/auth/login", {
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
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "Error de servidor en inicio de sesión." };
    }
  };

  const register = async (nombre, usuario, contrasenia, rol) => {
    try {
      const response = await fetch("/api/auth/register", {
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
    } catch (err) {
      console.error("Register error:", err);
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
      const response = await fetch("/api/recursos", {
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
    } catch (err) {
      console.error("Error al agregar recurso:", err);
    }
  };

  const updateRecurso = async (id, updatedItem) => {
    try {
      const response = await fetch(`/api/recursos/${id}`, {
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
    } catch (err) {
      console.error("Error al editar recurso:", err);
    }
  };

  const deleteRecurso = async (id) => {
    try {
      const response = await fetch(`/api/recursos/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setRecursos((prev) => prev.filter((item) => String(item.id) !== String(id)));
          setFavoritos((prev) => prev.filter((favId) => String(favId) !== String(id)));
        }
      }
    } catch (err) {
      console.error("Error al eliminar recurso:", err);
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
      const response = await fetch("/api/tutoriales", {
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
    } catch (err) {
      console.error("Error al agregar tutorial:", err);
    }
  };

  const updateTutorial = async (id, updatedItem) => {
    try {
      const response = await fetch(`/api/tutoriales/${id}`, {
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
    } catch (err) {
      console.error("Error al editar tutorial:", err);
    }
  };

  const deleteTutorial = async (id) => {
    try {
      const response = await fetch(`/api/tutoriales/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setTutoriales((prev) => prev.filter((item) => String(item.id) !== String(id)));
        }
      }
    } catch (err) {
      console.error("Error al eliminar tutorial:", err);
    }
  };

  // --- CRUD ACTIONS FOR NOTICIAS ---
  const addNoticia = async (item) => {
    try {
      const response = await fetch("/api/noticias", {
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
    } catch (err) {
      console.error("Error al publicar comunicado:", err);
    }
  };

  const updateNoticia = async (id, updatedItem) => {
    try {
      const response = await fetch(`/api/noticias/${id}`, {
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
    } catch (err) {
      console.error("Error al editar comunicado:", err);
    }
  };

  const deleteNoticia = async (id) => {
    try {
      const response = await fetch(`/api/noticias/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (await handleApiResponse(response)) {
        if (response.ok) {
          setNoticias((prev) => prev.filter((item) => String(item.id) !== String(id)));
        }
      }
    } catch (err) {
      console.error("Error al eliminar comunicado:", err);
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
      const response = await fetch("/api/import", {
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
    } catch (err) {
      console.error("Error al importar datos:", err);
      return { success: false, error: err.message };
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