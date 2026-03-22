import { describe, it, expect } from "vitest";
import { extrairPaginacao } from "./paginacao";
import { Context } from "hono";

describe("paginacao", () => {
  it("deve usar valores padrão quando params estão ausentes", () => {
    const mockCtx = {
      req: {
        query: (key: string) => undefined
      }
    } as unknown as Context;
    const res = extrairPaginacao(mockCtx);
    expect(res.limit).toBe(20);
    expect(res.offset).toBe(0);
  });

  it("deve converter params de string para number", () => {
    const mockCtx = {
      req: {
        query: (key: string) => key === 'page' ? '2' : '10'
      }
    } as unknown as Context;
    const res = extrairPaginacao(mockCtx);
    expect(res.limit).toBe(10);
    expect(res.offset).toBe(10); 
  });
});
