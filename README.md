# Gerador de Escalas - PIB São João dos Patos

Aplicativo inteligente para gerenciamento e geração automática de escalas da Primeira Igreja Batista em São João dos Patos (PIBSJD).

## Funcionalidades

- 📅 **Calendário Dinâmico:** Visualização e edição mensal com persistência automática no navegador (`localStorage`).
- 🤖 **IA com Gemini 2.5 Flash:** Geração automática de escalas respeitando regras específicas de liderança, pregadores e cultos domiciliares.
- 🖼️ **Exportação em Alta Definição:** Exportação da escala em PNG nítido e em PDF formatado para impressão/compartilhamento.
- 🔄 **Histórico Integrado:** Escalas históricas pré-carregadas para referência e aprendizado contínuo.

## Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/aldonks/Gerador-de-Escalas-PIBSJD.git
   cd Gerador-de-Escalas-PIBSJD
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure sua chave do Google Gemini no arquivo `.env.local`:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```
4. Inicie o servidor:
   ```bash
   npm run dev
   ```

## Como Publicar no Cloudflare Pages

1. No painel do [Cloudflare](https://dash.cloudflare.com/), vá em **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Selecione o repositório `aldonks/Gerador-de-Escalas-PIBSJD`.
3. Configurações de Build:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Em **Environment variables**, adicione:
   - Variável: `GEMINI_API_KEY`
   - Valor: Sua chave da API do Google AI Studio
5. Clique em **Save and Deploy**.
