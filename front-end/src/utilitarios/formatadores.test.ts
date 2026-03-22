import { describe, it, expect } from "vitest";
import { formatarDataHora, formatarHoras } from "./formatadores";

describe("formatadores", () => {
  it("formatarDataHora deve formatar corretamente ISO para PT-BR", () => {
    const data = "2025-03-05T14:30:00Z";
    // Nota: O resultado depende do timezone, mas testamos o padrão esperado.
    expect(formatarDataHora(data)).toContain("05/03");
  });

  it("formatarHoras deve formatar minutos em string legível", () => {
    expect(formatarHoras(125)).toBe("2h 5min");
    expect(formatarHoras(60)).toBe("1h 0min");
  });
});
