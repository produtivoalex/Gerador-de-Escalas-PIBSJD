# Roadmap — Gerador de Escalas PIB

**Estado:** publicado na VPS com login, sincronização SQLite e backup diário.
**Revisado em:** 12/09/2026. Setembro/2026 foi recuperado da imagem fornecida; meses seguintes precisam de confirmação.
**Destino escolhido:** VPS `152.67.51.178`, substituindo o plano de Cloudflare Pages. Veja [DEPLOYMENT.md](DEPLOYMENT.md).

## Concluído

- Calendário mensal, edição e exclusão de cultos e gerenciamento de nomes.
- Migração dos dados anteriores para um salvamento consolidado, preservando listas vazias e exclusões.
- Backup e restauração de escalas, nomes, aparência, conversas e mês selecionado.
- Exportação de PNG em alta resolução e PDF A4 em paisagem; dependências de exportação carregadas sob demanda.
- Gemini por API de servidor, com segredo fora do bundle, validação de entrada e resposta e mensagens de erro.
- Documentação de execução e publicação na VPS.
- Testes automatizados de API, SQLite, backup e interface; build e checagem de ausência da chave no bundle.
- Solicitação real e limitada ao Gemini verificada com dados fictícios; nenhuma escala alterada.
- Login privado com PIN scrypt, recuperação por email após três erros e cookies HttpOnly/Secure; o SMTP na VPS ainda depende da senha de app Gmail.
- Sincronização entre dispositivos da conta proprietária, conflitos explícitos e histórico de 30 versões.
- Lista para celular, edição por teclado e auditoria automatizada do editor móvel.
- Contêiner sem root, volume persistente e limites de CPU/memória; backup SQLite diário.
- Instalação anterior preservada, rollback documentado e snapshot recuperável baixado para o workspace.

## Próximos passos

### P0 — preparar e verificar a publicação

- [x] Recuperar e migrar a escala de setembro/2026 da imagem, preservando edições existentes.
- [ ] Confirmar escalas e nomes dos meses seguintes com os responsáveis pela igreja.
- [ ] Configurar a senha de app Gmail na VPS e validar o envio de email, antes de publicar a troca para PIN.
- [x] Configurar a chave Gemini e o modelo no servidor da VPS, após autorização explícita do proprietário.
- [x] Proteger API por login e limitar chamadas de IA a 20/hora e 100/dia por conta.
- [x] Publicar pelo Docker/Nginx no túnel HTTPS existente; validar login, assets, API privada e uma chamada real da IA sem alterar escalas.
- [x] Verificar a publicação estática anterior: nenhum padrão de chave Gemini encontrado nos assets. Nenhuma revogação foi necessária a partir dessa verificação.
- [x] Preservar a instalação anterior e testar recuperação do backup SQLite fora da VPS. Os dados pessoais ainda no navegador serão migrados na primeira entrada; não foram acessados por esta sessão.
- [ ] Configurar domínio/túnel permanente: o endereço `trycloudflare.com` atual pode mudar se o túnel reiniciar.

**Pronto quando:** publicação HTTPS configurada; endpoint de IA protegido; chave ausente nos arquivos públicos; fluxos principais verificados na produção; backup recuperável.

### P1 — decidir sincronização e recuperação

- [x] Sincronização aprovada pelo usuário, hospedada na própria VPS para a conta proprietária `produtivoalex`.
- [x] Histórico de versões, restauração e conflitos entre dispositivos implementados e testados; nenhuma mesclagem silenciosa.
- [x] Falha de cota do `localStorage` e restauração em outro contexto de navegador verificadas.
- [x] Backup JSON manual mantido como opção de transferência e recuperação; backup diário do servidor ativado.
- [ ] Definir usuários adicionais e permissões caso outras pessoas precisem entrar; não há cadastro público.

**Pronto quando:** os usuários conseguem transferir e recuperar os dados documentados sem sobrescrever informações por engano; sincronização automática, se escolhida, está autenticada e testada com conflitos.

### P2 — operação e experiência

- [x] Validar lista em celular, teclado, foco do editor e auditoria automatizada WCAG A/AA no editor móvel. Avaliação humana com leitor de tela segue recomendada.
- [x] Validar conectividade real Gemini em produção e testes simulados de erro/cota; limites de pedidos e saída configurados.
- [x] Atualizar documentação de execução, publicação, recuperação e pendências externas.

**Verificação local:** `npm run typecheck`, `npm test`, `npm run build`, `npm run check:build` e `npm run test:e2e`.
