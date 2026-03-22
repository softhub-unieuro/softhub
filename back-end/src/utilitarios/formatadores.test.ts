import { describe, it, expect } from "vitest";
import { formatarDataHora, formatarHoras } from "./formatadores";

describe("formatadores backend", () => {
  it("formatarDataHora deve formatar corretamente", () => {
    const data = "2025-03-05T14:30:00Z";
    expect(formatarDataHora(data)).toContain("05/03");
  });

  it("formatarHoras deve converter minutos", () => {
    expect(formatarHoras(125)).toBe("2h 5min");
  });
});
