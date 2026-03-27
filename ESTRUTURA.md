# Estrutura do Projeto - Comanda Virtual My Tender

Este projeto é uma aplicação web para gerenciamento de comandas de restaurante, integrando uma interface mobile-first com serviços de backend via Vercel Functions.

## 📂 Estrutura de Diretórios

### 🌐 Backend & Infraestrutura
- **`/api`**: Contém as Serverless Functions do Vercel. Responsável pelo processamento de dados e integração com serviços externos.
  - `comandas.js`: Endpoints principais para gestão de comandas.
  - `comandas/weights.js`: Endpoint específico para atualização de pesos de itens.
- **`/models`**: Definições de modelos de dados e lógica de negócio do domínio.
- **`/infra`**: Camada de infraestrutura, incluindo clientes de API externa (`mytender.js`), tratadores de erro (`errors.js`) e handlers (`handlers.js`).

### 💻 Frontend (React + Vite)
- **`/src`**: Código fonte da aplicação frontend.
  - **`/components`**: Componentes React reutilizáveis (Ex: `HandleResponse.jsx`).
  - **`/hooks`**: Hooks customizados para lógica de estado e requisições (Ex: `useRequest.js`).
  - **`/pages`**: Componentes que representam as telas da aplicação (`Home.jsx`, `Comanda.jsx`, `Comanda/Balanca.jsx`).
  - **`/services`**: Clientes de API para o frontend, incluindo mocks para desenvolvimento e testes.
  - **`/utils`**: Funções utilitárias e formatadores.
  - **`/assets`**: Imagens e recursos estáticos.
- **`/public`**: Arquivos públicos servidos diretamente pelo servidor (ícones, favicon).

### 🧪 Testes & Configuração
- **`/test`**: Testes automatizados (Ex: `comandas.test.js`).
- **`package.json`**: Gerenciamento de dependências e scripts do projeto.
- **`vite.config.js`**: Configuração do bundler Vite.
- **`vercel.ts`**: Configurações de ambiente/deploy para o Vercel.
- **`tsconfig.json`**: Configurações do TypeScript (utilizado em partes do projeto).

## 🚀 Tecnologias Principais
- **Frontend**: React 19, Vite, React Router Dom.
- **Backend**: Node.js (Vercel Functions).
- **Comunicação**: Axios.
