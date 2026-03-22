import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PainelRelogio } from "./PainelRelogio";

describe("PainelRelogio", () => {
  const mockProps = {
    agoraRelogio: new Date(),
    podeRegistrar: true,
    tentativaBloqueada: false,
    salvando: false,
    carregando: false,
    proximoTipo: 'entrada' as const,
    aoTentarRegistrar: vi.fn(),
    aoBaterPonto: vi.fn(),
  };

  it("renderiza o botão de bater ponto", () => {
    render(<PainelRelogio {...mockProps} />);
    expect(screen.getByText(/Registrar entrada/i)).toBeInTheDocument();
  });

  it("chama aoBaterPonto quando clicado", () => {
    render(<PainelRelogio {...mockProps} />);
    fireEvent.click(screen.getByText(/Registrar entrada/i));
    expect(mockProps.aoBaterPonto).toHaveBeenCalled();
  });

  it("mostra estado de salvando", () => {
    render(<PainelRelogio {...mockProps} salvando={true} />);
    // O componente usa o Carregando quando salvando=true
    expect(screen.queryByText(/Registrar entrada/i)).not.toBeInTheDocument();
  });
});
