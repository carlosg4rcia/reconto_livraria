import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'

interface Book {
  id: string
  title: string
  author: string
  price: number
  stock_quantity: number
}

interface Customer {
  id: string
  name: string
}

interface CartItem {
  book: Book
  quantity: number
}

export default function NewSale() {
  const [books, setBooks] = useState<Book[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedBook, setSelectedBook] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    loadBooks()
    loadCustomers()
  }, [])

  const loadBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('id, title, author, price, stock_quantity')
      .gt('stock_quantity', 0)
      .order('title')
    setBooks(data || [])
  }

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name').order('name')
    setCustomers(data || [])
  }

  const addToCart = () => {
    if (!selectedBook) return

    const book = books.find((b) => b.id === selectedBook)
    if (!book) return

    if (quantity > book.stock_quantity) {
      alert('Quantidade indisponível em estoque')
      return
    }

    const existingItem = cart.find((item) => item.book.id === book.id)

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      if (newQuantity > book.stock_quantity) {
        alert('Quantidade total ultrapassa o estoque disponível')
        return
      }
      setCart(
        cart.map((item) =>
          item.book.id === book.id ? { ...item, quantity: newQuantity } : item
        )
      )
    } else {
      setCart([...cart, { book, quantity }])
    }

    setSelectedBook('')
    setQuantity(1)
  }

  const removeFromCart = (bookId: string) => {
    setCart(cart.filter((item) => item.book.id !== bookId))
  }

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.book.price * item.quantity, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (cart.length === 0) {
      alert('Adicione pelo menos um item ao carrinho')
      return
    }

    setLoading(true)

    try {
      const totalAmount = getTotalAmount()

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            customer_id: selectedCustomer || null,
            user_id: user?.id,
            total_amount: totalAmount,
            payment_method: paymentMethod,
            status: 'completed',
            notes: notes || null,
          },
        ])
        .select()
        .single()

      if (saleError) throw saleError

      const saleItems = cart.map((item) => ({
        sale_id: saleData.id,
        book_id: item.book.id,
        quantity: item.quantity,
        unit_price: item.book.price,
        subtotal: item.book.price * item.quantity,
      }))

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)

      if (itemsError) throw itemsError

      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('books')
          .update({ stock_quantity: item.book.stock_quantity - item.quantity })
          .eq('id', item.book.id)

        if (stockError) throw stockError
      }

      alert('Venda realizada com sucesso!')
      navigate('/sales')
    } catch (error) {
      console.error('Error creating sale:', error)
      alert('Erro ao realizar venda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Nova Venda</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Adicionar Produtos</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Livro</label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecione um livro...</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} - {book.author} (Estoque: {book.stock_quantity}) - R${' '}
                      {Number(book.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={addToCart}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho
            </h2>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Carrinho vazio</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.book.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{item.book.title}</h3>
                      <p className="text-sm text-gray-600">{item.book.author}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.quantity} x R$ {Number(item.book.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-emerald-600">
                        R$ {(item.book.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.book.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 sticky top-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Detalhes da Venda</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente (Opcional)
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecione...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="cash">Dinheiro</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-gray-700">Total:</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    R$ {getTotalAmount().toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processando...' : 'Finalizar Venda'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/sales')}
                  className="w-full mt-2 border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
