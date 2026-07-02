import { describe, it } from "node:test";
import assert from "node:assert";

// ---------- Unit: auditoria helpers ----------
describe("auditoria helpers", () => {
  it("getClientIp extrae la primera IP de X-Forwarded-For", async () => {
    const { getClientIp } = await import("../server/services/auditoria.js");
    const mockReq = { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" }, socket: {} };
    assert.strictEqual(getClientIp(mockReq), "1.2.3.4");
  });

  it("getClientIp cae al socket cuando no hay header", async () => {
    const { getClientIp } = await import("../server/services/auditoria.js");
    const mockReq = { headers: {}, socket: { remoteAddress: "9.9.9.9" } };
    assert.strictEqual(getClientIp(mockReq), "9.9.9.9");
  });

  it("getUserAgent devuelve el header user-agent", async () => {
    const { getUserAgent } = await import("../server/services/auditoria.js");
    const mockReq = { headers: { "user-agent": "TestBrowser/1.0" } };
    assert.strictEqual(getUserAgent(mockReq), "TestBrowser/1.0");
  });

  it("getUserAgent devuelve null si no hay header", async () => {
    const { getUserAgent } = await import("../server/services/auditoria.js");
    const mockReq = { headers: {} };
    assert.strictEqual(getUserAgent(mockReq), null);
  });
});

// ---------- Unit: registrarAuditoria sin modelo ----------
describe("registrarAuditoria sin modelo inicializado", () => {
  it("no lanza excepciones si el modelo es null", async () => {
    // Importamos fresco sin setAuditoriaModel
    const mod = await import("../server/services/auditoria.js");
    // Ejecutar sin modelo seteado no debe lanzar
    await assert.doesNotReject(() =>
      mod.registrarAuditoria({ accion: "LOGIN_EXITOSO", exito: true })
    );
  });
});

// ---------- Unit: logger ----------
describe("logger", () => {
  it("logger es una instancia válida de winston con métodos estándar", async () => {
    const { default: logger } = await import("../server/services/logger.js");
    assert.strictEqual(typeof logger.info, "function");
    assert.strictEqual(typeof logger.warn, "function");
    assert.strictEqual(typeof logger.error, "function");
  });
});
