# Gerador de Escalas — PIB São José do Divino - PI

Calendário de direção dos cultos com React, TypeScript e Vite.

## Publicação atual: VPS

A publicação principal usa **Node.js 24 + SQLite + Docker** na VPS `152.67.51.178`, com login privado,
sincronização automática entre dispositivos e histórico das últimas 30 versões.
Consulte [DEPLOYMENT.md](DEPLOYMENT.md) para operação, backup e recuperação. A publicação depende do servidor VPS para conta e sincronização.

- Lista legível no celular, edição por teclado, controles nomeados e editor modal acessível.
- Login do proprietário com PIN de quatro dígitos protegido por scrypt e sessões HttpOnly/Secure de até 7 dias. Após três erros, a recuperação exige código enviado ao email cadastrado; o SMTP precisa estar ativo na VPS.
- Sincronização a cada 3 segundos. Conflitos exigem escolher entre a versão local e a nuvem; nenhuma edição concorrente é mesclada silenciosamente.
- **Histórico** restaura uma versão anterior como uma nova versão. **Baixar backup local** preserva alterações antes de resolver conflitos.
- Limites de IA por conta: 20 pedidos/hora e 100/dia, configuráveis. Respostas limitadas a 8192 tokens; falhas também contam para a cota local.
- Backup diário consistente do SQLite; mantenha também uma cópia fora da VPS.

Na primeira entrada, se a nuvem estiver vazia, o conteúdo disponível no navegador será enviado para a conta.
Em outro dispositivo, os dados sincronizados serão carregados. O acesso inicial exige conexão; após abrir,
falhas de rede preservam as alterações no navegador para uma nova tentativa. Não limpe os dados locais com mudanças pendentes.
A conta inicial é somente a do proprietário. Contas adicionais e compartilhamento precisam de definição dos usuários e permissões.

As configurações privadas são geradas por `node scripts/prepare-vps.mjs https://seu-dominio`, nos arquivos
`.env.production.local` e `ACESSO-VPS.local`, ignorados pelo Git. Para publicar: `docker compose -p cultogen up -d --build`.

## Funcionalidades

- Edição e exclusão de cultos, gerenciamento de nomes e personalização visual.
- Salvamento automático no navegador, preservando exclusões mesmo após recarregar.
- Histórico inicial de dezembro/2025, janeiro/2026 e março a setembro/2026 (fevereiro não está incluído). Setembro foi recuperado da imagem; edições existentes são preservadas.
- Assistente Gemini com envio de imagens, regras de revezamento e contexto dos eventos existentes.
- PNG em alta resolução e PDF A4 em paisagem. As bibliotecas de exportação só carregam quando utilizadas.
- Botões **Backup** e **Importar** para salvar/restaurar escalas, nomes, visual, padrão visual, conversas e mês selecionado.

## Executar localmente

Use Node.js 24 ou superior. Instale com `npm ci`, copie `.env.example` para `.env.local` e preencha:

```env
GROQ_API_KEY=sua_chave_aqui
GROQ_MODEL=llama-3.3-70b-versatile
```

Execute `npm run dev` e abra http://127.0.0.1:3000. No PowerShell com restrição de scripts, use `npm.cmd run dev`.
A edição e as exportações funcionam sem chave; somente o assistente depende dela.

O navegador chama `/api/generate`. A chave fica no servidor e não é incorporada ao JavaScript público.
O modelo pode ser alterado por `GROQ_MODEL`; o padrão é `llama-3.3-70b-versatile`.
O servidor valida pedidos e respostas e informa falhas de configuração, limite de uso e tempo de espera.
Não há tentativa automática em outro modelo que possa duplicar custos ou mascarar um erro de configuração.

## Dados e backup

O salvamento usa `cultogen_state_v1` no `localStorage`. Dados das versões anteriores são migrados na primeira abertura,
incluindo listas vazias e exclusões. As chaves antigas são preservadas como referência de recuperação.
Dados ilegíveis não são sobrescritos silenciosamente; o aplicativo exibe um aviso. Falhas de armazenamento também são informadas.

**Backup** baixa um JSON que deve ser guardado fora do navegador, por exemplo em uma pasta do Drive/OneDrive.
**Importar** valida o arquivo antes de pedir confirmação para substituir os dados atuais. Exporte o estado atual antes de importar
outro arquivo. O backup inclui conversas e imagens anexadas, mas não inclui a chave da API. Limite de importação: 15 MB;
a capacidade efetiva do armazenamento depende do navegador.

O modo de desenvolvimento local não tem login nem sincronização. A versão VPS tem login e banco sincronizado por conta; backups também permitem transferir os dados.
`localhost`, `127.0.0.1` e o domínio publicado têm armazenamentos separados; use sempre o mesmo endereço ou transfira um backup.

## Validação

```bash
npm run typecheck
npm test
npm run build
npm run check:build
npm run test:e2e
```

`check:build` verifica se a chave configurada ou um padrão de credencial Gemini aparece nos arquivos públicos gerados.
Os testes unitários cobrem persistência, backup, validação e API com respostas simuladas.
Os testes de navegador usam Chrome instalado, perfil isolado e um servidor na porta 3100; cobrem exclusão/recarga,
restauração de backup, integração da interface com a API simulada e downloads PNG/PDF.
Não fazem chamadas pagas ao Gemini. Para outro ambiente, ajuste `channel` e o comando de servidor em `playwright.config.ts`.
`npm run preview` serve o build e a API localmente. Fontes ainda usam Google Fonts, com fontes alternativas se indisponível.
