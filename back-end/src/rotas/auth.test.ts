import { describe, it, expect } from "vitest";
import { testClient } from "@hono/testing";
import app from "../index";

describe("POST /api/auth/login", () => {
  it("rejeita requisição sem body", async () => {
    // @ts-ignore - simulando erro de cliente
    const res = await testClient(app).api.auth.login.$post({ json: {} });
    expect(res.status).toBe(400); 
  });

  it("rejeita credenciais inválidas", async () => {
    const res = await testClient(app).api.auth.login.$post({
      json: { email: "nao@existe.com", senha: "errada" },
    });
    expect(res.status).toBe(401);
  });
});
