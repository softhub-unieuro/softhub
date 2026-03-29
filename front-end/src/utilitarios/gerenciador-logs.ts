
/**
 * Gerenciador de Logs e Notificações Visuais
 */

export const logger = {
  sucesso: (modulo: string, mensagem: string, dados?: any) => {
    console.log(`%c[${modulo}] SUCESSO: ${mensagem}`, 'color: #10b981; font-weight: bold;', dados || '');
  },
  erro: (modulo: string, mensagem: string, erro?: any) => {
    console.error(`%c[${modulo}] ERRO: ${mensagem}`, 'color: #ef4444; font-weight: bold;', erro || '');
  },
  info: (modulo: string, mensagem: string, dados?: any) => {
    console.info(`%c[${modulo}] INFO: ${mensagem}`, 'color: #3b82f6; font-weight: bold;', dados || '');
  },
  aviso: (modulo: string, mensagem: string, dados?: any) => {
    console.warn(`%c[${modulo}] AVISO: ${mensagem}`, 'color: #f59e0b; font-weight: bold;', dados || '');
  }
};
