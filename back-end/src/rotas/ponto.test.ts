import { describe, it, expect } from "vitest";
import { testClient } from "hono/testing";
import { app } from "../index";

describe("POST /api/ponto/registrar", () => {
  it("bloqueia registro sem token (401)", async () => {
    const res = await testClient(app).api.ponto.registrar.$post({
      json: { tipo: 'entrada' }
    });
    expect(res.status).toBe(401);
  });

  // Note: Full integration tests would need a mocked D1 or a test database.
});
