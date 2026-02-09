# Reconto Livraria - Sistema de Gestão

Sistema completo de gestão para livrarias com funcionalidade de busca automática de informações de livros por ISBN.

## Funcionalidades

- Gestão de livros, categorias e estoque
- Registro de vendas e clientes
- Dashboard com estatísticas
- Relatórios de vendas
- **Busca automática de informações por ISBN** (Google Books API + Apify/Amazon)

## Busca por ISBN

O sistema permite buscar automaticamente informações de livros usando o ISBN. Basta:

1. Abrir o modal de cadastro de livro
2. Digitar o ISBN no campo correspondente
3. Clicar no botão "Buscar"
4. Os campos serão preenchidos automaticamente com as informações encontradas

### APIs Utilizadas

**Google Books API (padrão - gratuita):**
- Busca informações de livros por ISBN
- Não requer configuração
- Retorna: título, autor, descrição, editora, ano de publicação, preço e imagem da capa

**Apify/Amazon Scraper (opcional):**
- Busca informações diretamente da Amazon Brasil
- Requer token da API Apify (veja configuração abaixo)
- Usado como alternativa quando configurado
- Retorna dados mais completos da Amazon

### Configuração do Apify (Opcional)

Para usar o scraper da Amazon via Apify:

1. Crie uma conta em [apify.com](https://apify.com)
2. Acesse [console.apify.com/account/integrations](https://console.apify.com/account/integrations)
3. Copie seu API token
4. Adicione ao arquivo `.env`:

```env
VITE_APIFY_API_TOKEN=seu_token_aqui
```

Sem o token do Apify configurado, o sistema usará apenas o Google Books API (que já funciona sem configuração).

## Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente no arquivo `.env` (já configurado com Supabase)

4. Execute o projeto:
```bash
npm run dev
```

## Tecnologias

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (autenticação e banco de dados)
- React Router
- Lucide Icons
- Google Books API
- Apify REST API