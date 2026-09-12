# Operação do CultoGen na VPS

Destino: `ubuntu@152.67.51.178`. Release: `/opt/cultogen/releases/20260912-vps`.
Projeto Compose: `cultogen`; contêiner: `cultogen-cultogen-1`; volume: `cultogen_cultogen-data`.
Credenciais e chave da IA ficam em `.env.production.local`, com permissão 600. O acesso local está em `ACESSO-VPS.local`.

## Endereço

O túnel existente usa `https://bird-echo-reuters-leasing.trycloudflare.com` e encaminha para Nginx na porta 8080.
É um Quick Tunnel: o endereço pode mudar se o serviço do túnel reiniciar. Um endereço permanente depende de configurar um túnel nomeado/domínio sob seu controle.
Quando o domínio mudar, atualize `APP_ORIGIN`, reinicie apenas o contêiner e transfira um backup dos dados locais pendentes.
O banco SQLite permanece no volume, independentemente do domínio.

## Verificação e atualização

```sh
cd /opt/cultogen/releases/20260912-vps
sudo docker compose -p cultogen ps
sudo docker compose -p cultogen logs --tail=50
curl -f http://127.0.0.1:3210/api/health
sudo systemctl status nginx cultogen-tunnel cultogen-backup.timer
```

Exporte um backup antes de atualizar. Envie o código preservando o arquivo privado de configuração e execute:

```sh
sudo docker exec cultogen-cultogen-1 node dist-server/backup.mjs
sudo docker compose -p cultogen up -d --build
```

Não use `docker compose down -v`: isso excluiria o banco. Não publique `dist` sozinho; login e sincronização precisam do servidor.
O contêiner roda sem root, com memória limitada a 512 MB e porta 3210 ligada somente ao loopback.

## Configuração privada

| Variável | Uso |
| --- | --- |
| `APP_ORIGIN` | Origem HTTPS exata, usada para validar escritas |
| `ADMIN_USERNAME` | Conta proprietária |
| `ADMIN_PASSWORD_HASH` | Hash scrypt gerado pelo script de preparação |
| `GEMINI_API_KEY` | Chave da IA, somente no servidor |
| `GEMINI_MODEL` | Modelo Gemini configurável |
| `AI_HOURLY_LIMIT` | Pedidos de IA por hora; padrão 20 |
| `AI_DAILY_LIMIT` | Pedidos de IA por dia; padrão 100 |
| `DATABASE_PATH` | No contêiner, `/data/cultogen.sqlite` |

## Backups e restauração

O timer `cultogen-backup.timer` executa diariamente às 03:00 no horário da VPS, com atraso aleatório de até 5 minutos.
Os snapshots consistentes ficam em `/data/backups` no volume. Não incluem a chave Gemini.
Não há exclusão automática; acompanhe o espaço e transfira cópias para fora da VPS.

```sh
sudo systemctl start cultogen-backup.service
sudo docker exec cultogen-cultogen-1 ls -lh /data/backups
sudo docker cp cultogen-cultogen-1:/data/backups/ARQUIVO.sqlite ./cultogen-backup.sqlite
```

Para recuperar uma escala individual, prefira **Histórico** ou **Importar** no aplicativo.
Para restaurar o banco inteiro: pare o contêiner, preserve uma cópia do volume atual e substitua o banco por um snapshot validado.
Remova os arquivos WAL/SHM antigos somente depois de parar o servidor e preservar a cópia. Ajuste o proprietário para UID/GID 1000 e reinicie.
O SQLite inclui sessões; trate os snapshots como privados e encerre sessões após restaurar um backup antigo.

## Voltar à instalação anterior

Cópia original: `/opt/cultogen-backups/pre-vps-20260912.tar.gz`.
Configuração original: `/opt/cultogen-backups/nginx-before-vps.conf`.
A pasta estática `/var/www/cultogen` permanece disponível. Para voltar:

```sh
sudo cp /opt/cultogen-backups/nginx-before-vps.conf /etc/nginx/sites-available/cultogen
sudo nginx -t && sudo systemctl reload nginx
```

A volta não exclui o banco novo. Exporte as alterações sincronizadas antes de voltar, pois a instalação anterior usa apenas dados locais.

## Validação

`npm run typecheck`, `npm test`, `npm run build`, `npm run check:build` e `npm run test:e2e`.
O Chrome usa perfis isolados e as portas 3100/3200. Os testes não fazem chamadas pagas de IA.
A auditoria automatizada de acessibilidade no editor móvel não substitui uma avaliação humana com leitor de tela.

Referências: [SQLite no Node.js](https://nodejs.org/api/sqlite.html), [scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback) e [limitações de Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).
