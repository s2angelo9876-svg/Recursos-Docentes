import { describe, it } from "node:test";
import assert from "node:assert";
import { getYouTubeId, isValidYouTubeUrl, getYouTubeThumbnail } from "../src/utils/youtube.js";

describe("youtube utils", () => {
  it("extrae el ID de URLs de YouTube comunes", () => {
    assert.strictEqual(getYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.strictEqual(getYouTubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.strictEqual(getYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.strictEqual(getYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  it("devuelve null para enlaces inválidos", () => {
    assert.strictEqual(getYouTubeId("https://example.com"), null);
    assert.strictEqual(getYouTubeId(""), null);
    assert.strictEqual(getYouTubeId(null), null);
  });

  it("valida correctamente enlaces de YouTube", () => {
    assert.strictEqual(isValidYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
    assert.strictEqual(isValidYouTubeUrl("https://example.com"), false);
  });

  it("genera la URL de miniatura", () => {
    assert.strictEqual(getYouTubeThumbnail("dQw4w9WgXcQ"), "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
    assert.strictEqual(getYouTubeThumbnail("dQw4w9WgXcQ", "hqdefault"), "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    assert.strictEqual(getYouTubeThumbnail(null), null);
  });
});
