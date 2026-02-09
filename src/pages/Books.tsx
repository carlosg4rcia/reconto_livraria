import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Edit2, Trash2, Loader2, Upload, Download, FileSpreadsheet } from 'lucide-react'
import { searchBookByISBN } from '../services/bookScraper'
import { parseExcelFile, generateExcelTemplate, ExcelBookData } from '../services/excelImporter'

interface Book {
  id: string
  title: string
  author: string
  isbn: string | null
  category_id: string | null
  price: number
  stock_quantity: number
  description: string | null
  publisher: string | null
  publication_year: number | null
  category?: { name: string } | null
}

interface Category {
  id: string
  name: string
}

export default function Books() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [isbnSearchLoading, setIsbnSearchLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importedBooks, setImportedBooks] = useState<ExcelBookData[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category_id: '',
    price: '',
    stock_quantity: '',
    description: '',
    publisher: '',
    publication_year: '',
  })

  useEffect(() => {
    loadBooks()
    loadCategories()
  }, [])

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*, category:categories(name)')
        .order('title')

      if (error) throw error
      setBooks(data || [])
    } catch (error) {
      console.error('Error loading books:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name')
    setCategories(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const bookData = {
      title: formData.title,
      author: formData.author,
      isbn: formData.isbn || null,
      category_id: formData.category_id || null,
      price: parseFloat(formData.price),
      stock_quantity: parseInt(formData.stock_quantity),
      description: formData.description || null,
      publisher: formData.publisher || null,
      publication_year: formData.publication_year ? parseInt(formData.publication_year) : null,
    }

    try {
      if (editingBook) {
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingBook.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('books').insert([bookData])
        if (error) throw error
      }

      setShowModal(false)
      setEditingBook(null)
      resetForm()
      loadBooks()
    } catch (error) {
      console.error('Error saving book:', error)
      alert('Erro ao salvar livro')
    }
  }

  const handleEdit = (book: Book) => {
    setEditingBook(book)
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      category_id: book.category_id || '',
      price: book.price.toString(),
      stock_quantity: book.stock_quantity.toString(),
      description: book.description || '',
      publisher: book.publisher || '',
      publication_year: book.publication_year?.toString() || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este livro?')) return

    try {
      const { error } = await supabase.from('books').delete().eq('id', id)
      if (error) throw error
      loadBooks()
    } catch (error) {
      console.error('Error deleting book:', error)
      alert('Erro ao excluir livro')
    }
  }

  const handleISBNSearch = async () => {
    if (!formData.isbn.trim()) {
      alert('Por favor, digite um ISBN para buscar')
      return
    }

    setIsbnSearchLoading(true)

    try {
      const bookData = await searchBookByISBN(formData.isbn)

      if (!bookData) {
        alert('Livro não encontrado. Tente outro ISBN.')
        return
      }

      const fieldsUpdated: string[] = []

      if (bookData.title && bookData.title !== formData.title) {
        fieldsUpdated.push('Título')
      }
      if (bookData.author && bookData.author !== formData.author) {
        fieldsUpdated.push('Autor')
      }
      if (bookData.description) {
        fieldsUpdated.push('Descrição')
      }
      if (bookData.publisher) {
        fieldsUpdated.push('Editora')
      }
      if (bookData.publicationYear) {
        fieldsUpdated.push('Ano')
      }
      if (bookData.price) {
        fieldsUpdated.push('Preço')
      }

      setFormData({
        ...formData,
        title: bookData.title || formData.title,
        author: bookData.author || formData.author,
        description: bookData.description || formData.description,
        publisher: bookData.publisher || formData.publisher,
        publication_year: bookData.publicationYear?.toString() || formData.publication_year,
        price: bookData.price?.toString() || formData.price,
      })

      if (fieldsUpdated.length > 0) {
        alert(`✓ Dados carregados com sucesso!\n\nCampos preenchidos:\n• ${fieldsUpdated.join('\n• ')}`)
      } else {
        alert('Livro encontrado, mas nenhum dado adicional disponível.')
      }
    } catch (error) {
      console.error('Error searching ISBN:', error)
      alert(`Erro ao buscar ISBN:\n${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsbnSearchLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category_id: '',
      price: '',
      stock_quantity: '',
      description: '',
      publisher: '',
      publication_year: '',
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)')
      return
    }

    setImportLoading(true)

    try {
      const result = await parseExcelFile(file)

      if (result.errors.length > 0) {
        console.warn('Erros durante importação:', result.errors)
      }

      if (result.books.length === 0) {
        alert('Nenhum livro válido encontrado na planilha')
        return
      }

      setImportedBooks(result.books)
      setShowImportModal(true)
      alert(`${result.success} livros carregados da planilha!${result.failed > 0 ? ` (${result.failed} linhas com erro)` : ''}`)
    } catch (error) {
      console.error('Error processing file:', error)
      alert('Erro ao processar arquivo')
    } finally {
      setImportLoading(false)
      event.target.value = ''
    }
  }

  const handleImportBooks = async () => {
    if (importedBooks.length === 0) return

    setImportLoading(true)
    setImportProgress({ current: 0, total: importedBooks.length })

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < importedBooks.length; i++) {
      const book = importedBooks[i]
      setImportProgress({ current: i + 1, total: importedBooks.length })

      try {
        let categoryId = null

        if (book.categoria) {
          const { data: existingCategory } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', book.categoria)
            .maybeSingle()

          if (existingCategory) {
            categoryId = existingCategory.id
          } else {
            const { data: newCategory, error: categoryError } = await supabase
              .from('categories')
              .insert([{ name: book.categoria }])
              .select('id')
              .single()

            if (!categoryError && newCategory) {
              categoryId = newCategory.id
            }
          }
        }

        const bookData = {
          title: book.titulo || '',
          author: book.autor || '',
          isbn: book.isbn || null,
          category_id: categoryId,
          price: book.preco || 0,
          stock_quantity: book.estoque || 0,
          description: book.descricao || null,
          publisher: book.editora || null,
          publication_year: book.ano || null,
        }

        const { error } = await supabase.from('books').insert([bookData])

        if (error) {
          console.error(`Erro ao importar livro ${book.titulo}:`, error)
          errorCount++
        } else {
          successCount++
        }
      } catch (error) {
        console.error(`Erro ao processar livro ${book.titulo}:`, error)
        errorCount++
      }
    }

    setImportLoading(false)
    setShowImportModal(false)
    setImportedBooks([])
    setImportProgress({ current: 0, total: 0 })

    alert(`Importação concluída!\n${successCount} livros importados com sucesso${errorCount > 0 ? `\n${errorCount} livros com erro` : ''}`)

    await loadBooks()
    await loadCategories()
  }

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Livros</h1>
        <div className="flex gap-3">
          <button
            onClick={() => generateExcelTemplate()}
            className="bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-700 transition flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Baixar Modelo
          </button>
          <label className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" />
            {importLoading ? 'Processando...' : 'Importar Planilha'}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={importLoading}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              setEditingBook(null)
              resetForm()
              setShowModal(true)
            }}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Livro
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por título ou autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Título</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Autor</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Categoria</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Preço</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Estoque</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBooks.map((book) => (
              <tr key={book.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">{book.title}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{book.author}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {book.category?.name || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  R$ {Number(book.price).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{book.stock_quantity}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleEdit(book)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(book.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBooks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum livro encontrado
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">
              {editingBook ? 'Editar Livro' : 'Novo Livro'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Autor *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ISBN</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="Digite o ISBN"
                    />
                    <button
                      type="button"
                      onClick={handleISBNSearch}
                      disabled={isbnSearchLoading || !formData.isbn.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      {isbnSearchLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Buscar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade em Estoque *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_quantity: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Editora
                  </label>
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ano de Publicação
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="2100"
                    value={formData.publication_year}
                    onChange={(e) =>
                      setFormData({ ...formData, publication_year: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                  {editingBook ? 'Salvar Alterações' : 'Cadastrar Livro'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingBook(null)
                    resetForm()
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Preview de Importação</h2>
                <p className="text-gray-600 mt-1">
                  {importedBooks.length} livro(s) pronto(s) para importação
                </p>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
            </div>

            {importLoading && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      Importando livros... {importProgress.current} de {importProgress.total}
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(importProgress.current / importProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Título
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Autor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        ISBN
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Categoria
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Preço
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Estoque
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importedBooks.slice(0, 10).map((book, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{book.titulo}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{book.autor}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {book.isbn || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {book.categoria || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {book.preco ? `R$ ${book.preco.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {book.estoque || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importedBooks.length > 10 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 text-center">
                  ... e mais {importedBooks.length - 10} livro(s)
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImportBooks}
                disabled={importLoading}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Confirmar Importação
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportedBooks([])
                }}
                disabled={importLoading}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
