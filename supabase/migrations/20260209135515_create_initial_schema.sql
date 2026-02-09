/*
  # Sistema de Gestão de Livraria - Schema Inicial

  ## Descrição
  Este migration cria a estrutura completa do banco de dados para o sistema de gestão de livraria,
  incluindo tabelas para categorias, livros, clientes, vendas e itens de venda.

  ## Novas Tabelas

  ### 1. categories (Categorias de Livros)
  - `id` (uuid, primary key) - Identificador único da categoria
  - `name` (text, not null) - Nome da categoria
  - `description` (text) - Descrição da categoria
  - `created_at` (timestamptz) - Data de criação

  ### 2. books (Livros)
  - `id` (uuid, primary key) - Identificador único do livro
  - `title` (text, not null) - Título do livro
  - `author` (text, not null) - Autor do livro
  - `isbn` (text, unique) - ISBN do livro
  - `category_id` (uuid, foreign key) - Referência à categoria
  - `price` (numeric, not null) - Preço do livro
  - `stock_quantity` (integer, not null) - Quantidade em estoque
  - `description` (text) - Descrição do livro
  - `publisher` (text) - Editora
  - `publication_year` (integer) - Ano de publicação
  - `cover_image` (text) - URL da imagem da capa
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de última atualização

  ### 3. customers (Clientes)
  - `id` (uuid, primary key) - Identificador único do cliente
  - `name` (text, not null) - Nome do cliente
  - `email` (text, unique) - Email do cliente
  - `phone` (text) - Telefone do cliente
  - `cpf` (text, unique) - CPF do cliente
  - `address` (text) - Endereço do cliente
  - `created_at` (timestamptz) - Data de criação

  ### 4. sales (Vendas)
  - `id` (uuid, primary key) - Identificador único da venda
  - `customer_id` (uuid, foreign key) - Referência ao cliente
  - `user_id` (uuid, foreign key) - Usuário que realizou a venda
  - `total_amount` (numeric, not null) - Valor total da venda
  - `payment_method` (text, not null) - Método de pagamento
  - `status` (text, not null) - Status da venda
  - `notes` (text) - Observações
  - `created_at` (timestamptz) - Data da venda

  ### 5. sale_items (Itens de Venda)
  - `id` (uuid, primary key) - Identificador único do item
  - `sale_id` (uuid, foreign key) - Referência à venda
  - `book_id` (uuid, foreign key) - Referência ao livro
  - `quantity` (integer, not null) - Quantidade vendida
  - `unit_price` (numeric, not null) - Preço unitário no momento da venda
  - `subtotal` (numeric, not null) - Subtotal do item

  ### 6. profiles (Perfis de Usuários)
  - `id` (uuid, primary key) - Referência ao auth.users
  - `full_name` (text) - Nome completo do usuário
  - `role` (text, not null) - Papel do usuário (admin, vendedor)
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de última atualização

  ## Segurança (RLS)
  - Todas as tabelas têm RLS habilitado
  - Políticas restritivas para acesso baseado em autenticação
  - Usuários autenticados podem ler dados
  - Apenas usuários autenticados podem criar/modificar registros
  - Profiles são criados automaticamente via trigger

  ## Índices
  - Índices criados para melhorar performance em consultas frequentes
  - ISBN, email e CPF são únicos para evitar duplicatas

  ## Triggers
  - Trigger para criar profile automaticamente quando um usuário é criado
  - Trigger para atualizar updated_at automaticamente
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  author text NOT NULL,
  isbn text UNIQUE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  description text,
  publisher text,
  publication_year integer,
  cover_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  cpf text UNIQUE,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES books(id) ON DELETE RESTRICT NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'vendedor',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_book ON sale_items(book_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for books
CREATE POLICY "Anyone can view books"
  ON books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update books"
  ON books FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete books"
  ON books FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for sales
CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for sale_items
CREATE POLICY "Authenticated users can view sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sale items"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sale items"
  ON sale_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for books updated_at
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'vendedor');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
