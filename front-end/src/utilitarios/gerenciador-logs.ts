/**
 * Gerenciador de Logs e Notificações Visuais para o Console.
 * Padroniza a coloração e formatação dos logs no ambiente de desenvolvimento.
 */
export const logger = {
  /**
   * Registra um evento bem-sucedido.
   * @param modulo - Área do sistema (ex: 'Auth', 'Kanban')
   * @param mensagem - Mensagem descritiva
   * @param dados - Objetos ou dados adicionais para inspeção
   */
  sucesso: (modulo: string, mensagem: string, dados?: unknown) => {
    console.log(`%c[${modulo}] SUCESSO: ${mensagem}`, 'color: #10b981; font-weight: bold;', dados || '');
  },

  /**
   * Registra uma falha ou exceção.
   * @param modulo - Área do sistema
   * @param mensagem - Mensagem explicativa
   * @param erro - Objeto de erro ou exceção
   */
  erro: (modulo: string, mensagem: string, erro?: unknown) => {
    console.error(`%c[${modulo}] ERRO: ${mensagem}`, 'color: #ef4444; font-weight: bold;', erro || '');
  },

  /**
   * Registra informações gerais de rastreamento.
   * @param modulo - Área do sistema
   * @param mensagem - Mensagem descritiva
   * @param dados - Dados adicionais
   */
  info: (modulo: string, mensagem: string, dados?: unknown) => {
    console.info(`%c[${modulo}] INFO: ${mensagem}`, 'color: #3b82f6; font-weight: bold;', dados || '');
  },

  /**
   * Registra alertas ou avisos de atenção.
   * @param modulo - Área do sistema
   * @param mensagem - Mensagem de alerta
   * @param dados - Dados adicionais
   */
  aviso: (modulo: string, mensagem: string, dados?: unknown) => {
    console.warn(`%c[${modulo}] AVISO: ${mensagem}`, 'color: #f59e0b; font-weight: bold;', dados || '');
  }
};

