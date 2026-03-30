import * as React from "react"
import { Button } from "./button"
import { Loader2 } from "lucide-react"

export interface BotaoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma' | 'contorno' | 'link'
  tamanho?: 'padrao' | 'pequeno' | 'grande' | 'icone'
  carregando?: boolean
  rotulo?: string
  icone?: React.ReactNode
}

const mapVariante = {
  primario: "default",
  secundario: "secondary",
  perigo: "destructive",
  fantasma: "ghost",
  contorno: "outline",
  link: "link"
} as const

const mapTamanho = {
  padrao: "default",
  pequeno: "sm",
  grande: "lg",
  icone: "icon"
} as const

export const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante = 'primario', tamanho = 'padrao', carregando, rotulo, icone, children, disabled, ...props }, ref) => {
    
    return (
      <Button
        ref={ref}
        variant={mapVariante[variante]}
        size={mapTamanho[tamanho]}
        disabled={carregando || disabled}
        className={className}
        {...props}
      >
        {carregando && <Loader2 className={`h-4 w-4 animate-spin ${(rotulo || children) ? 'mr-2' : ''}`} />}
        {!carregando && icone && (
          (rotulo || children) ? (
            <span className="mr-2">{icone}</span>
          ) : (
            icone
          )
        )}
        {rotulo || children}
      </Button>
    )
  }
)
Botao.displayName = "Botao"
