import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TelaLogin from "./TelaLogin";
import { BrowserRouter } from "react-router-dom";

// Mocking ContextoAutenticacao
vi.mock("@/contexto/ContextoAutenticacao", () => ({
  usarAutenticacao: () => ({
    usuario: null,
    carregando: false,
    login: vi.fn(),
  }),
}));

describe("TelaLogin", () => {
  it("renderiza o formulário de login", () => {
    render(
      <BrowserRouter>
        <TelaLogin />
      </BrowserRouter>
    );
    expect(screen.getByText(/Entrar no SoftHub/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/E-mail institucional/i)).toBeInTheDocument();
  });
});
