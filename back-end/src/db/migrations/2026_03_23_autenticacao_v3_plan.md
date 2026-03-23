# Plano de Implementação: Autenticação Segura (V3)

## 1. Banco de Dados (D1)
- [ ] Criar migração para adicionar `azure_oid` e `senha_hash` na tabela `usuarios`.
- [ ] Criar tabela `sessões` (ou `refresh_tokens`) para gestão de sessões ativas e rotação de refresh tokens.
  - Campos: `id`, `usuario_id`, `token_hash`, `device_info`, `ip`, `expira_em`, `criado_em`.

## 2. Backend (Hono/Workers)
- [ ] **Auth Service Base**: Criar `createSessionForUser` como ponto único de emissão de tokens.
  - Implementar geração de `accessToken` (curto) e `refreshToken` (longo).
  - Implementar rotação de refresh tokens (invalida o antigo ao usar o novo).
- [ ] **MSAL Auth**:
  - Garantir armazenamento do `oid` (Object ID) da Microsoft.
  - Implementar tratamento de conflito (Email já existe mas OID diferente).
- [ ] **QR Auth**:
  - Finalizar fluxo SSE.
  - Usar tokens de alta entropia.
- [ ] **Email/Config**: Adicionar suporte a login tradicional se configurado.

## 3. Frontend (React/Vite)
- [ ] **PainelQRCode**: Mudar para SSE e adicionar countdown.
- [ ] **TelaLogin**: Adicionar suporte a login por email/senha (opcional/admin).
- [ ] **ContextoAutenticacao**: Lidar com refresh tokens automáticos.

## 4. Segurança
- [ ] Rate limiting em todas as rotas de auth (já tem mas reforçar).
- [ ] Auditoria de logs para todos os fluxos.
