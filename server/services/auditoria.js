import logger from "./logger.js";

let AuditoriaSesion = null;

export function setAuditoriaModel(model) {
  AuditoriaSesion = model;
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || null;
}

export function getUserAgent(req) {
  return req.headers["user-agent"] || null;
}

export async function registrarAuditoria(datos) {
  if (!AuditoriaSesion) {
    logger.warn("Modelo de auditoría no inicializado; evento no registrado en BD", { accion: datos.accion });
    return;
  }

  try {
    await AuditoriaSesion.create({
      usuarioId: datos.usuarioId ?? null,
      usuarioNombre: datos.usuarioNombre ?? null,
      usuario: datos.usuario ?? null,
      rol: datos.rol ?? null,
      accion: datos.accion,
      entidad: datos.entidad ?? null,
      entidadId: datos.entidadId ?? null,
      detalle: datos.detalle ?? null,
      ip: datos.ip ?? null,
      userAgent: datos.userAgent ?? null,
      exito: datos.exito ?? true,
    });
  } catch (err) {
    logger.error("Error al registrar evento de auditoría", { error: err.message, accion: datos.accion });
  }
}

export async function auditoriaFromRequest(req, datos) {
  return registrarAuditoria({
    ...datos,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });
}
