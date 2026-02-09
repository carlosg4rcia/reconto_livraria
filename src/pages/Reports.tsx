import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp, DollarSign, ShoppingCart, Calendar } from 'lucide-react'

interface SalesByPeriod {
  date: string
  total: number
}

interface TopBook {
  title: string
  author: string
  quantity: number
  revenue: number
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [salesByPeriod, setSalesByPeriod] = useState<SalesByPeriod[]>([])
  const [topBooks, setTopBooks] = useState<TopBook[]>([])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
  })

  useEffect(() => {
    loadReports()
  }, [period])

  const loadReports = async () => {
    setLoading(true)
    try {
      const now = new Date()
      let startDate = new Date()

      if (period === 'week') {
        startDate.setDate(now.getDate() - 7)
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1)
      } else {
        startDate.setFullYear(now.getFullYear() - 1)
      }

      const { data: salesData } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .gte('created_at', startDate.toISOString())
        .order('created_at')

      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0
      const totalSales = salesData?.length || 0
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

      setStats({
        totalSales,
        totalRevenue,
        averageTicket,
      })

      const salesGrouped = salesData?.reduce((acc, sale) => {
        const date = new Date(sale.created_at).toLocaleDateString('pt-BR')
        const existing = acc.find((item) => item.date === date)
        if (existing) {
          existing.total += Number(sale.total_amount)
        } else {
          acc.push({ date, total: Number(sale.total_amount) })
        }
        return acc
      }, [] as SalesByPeriod[])

      setSalesByPeriod(salesGrouped || [])

      const { data: topBooksData } = await supabase
        .from('sale_items')
        .select('book_id, quantity, subtotal, book:books(title, author)')
        .gte('created_at', startDate.toISOString())

      const booksMap = new Map<string, TopBook>()

      topBooksData?.forEach((item: any) => {
        const bookId = item.book_id
        const existing = booksMap.get(bookId)

        if (existing) {
          existing.quantity += item.quantity
          existing.revenue += Number(item.subtotal)
        } else {
          booksMap.set(bookId, {
            title: item.book.title,
            author: item.book.author,
            quantity: item.quantity,
            revenue: Number(item.subtotal),
          })
        }
      })

      const topBooksArray = Array.from(booksMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      setTopBooks(topBooksArray)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando relatórios...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Relatórios</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'week'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Última Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'month'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Último Mês
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'year'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Último Ano
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Total de Vendas</h3>
          <p className="text-2xl font-bold text-gray-800">{stats.totalSales}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-500 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Receita Total</h3>
          <p className="text-2xl font-bold text-gray-800">R$ {stats.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Ticket Médio</h3>
          <p className="text-2xl font-bold text-gray-800">
            R$ {stats.averageTicket.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Vendas por Dia
          </h2>

          {salesByPeriod.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma venda no período</p>
          ) : (
            <div className="space-y-3">
              {salesByPeriod.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700">{item.date}</span>
                  <span className="font-bold text-emerald-600">
                    R$ {item.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Livros Mais Vendidos
          </h2>

          {topBooks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum livro vendido no período</p>
          ) : (
            <div className="space-y-3">
              {topBooks.map((book, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{book.title}</h3>
                    <p className="text-sm text-gray-600">{book.author}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {book.quantity} unidade{book.quantity !== 1 ? 's' : ''} vendida
                      {book.quantity !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">
                      R$ {book.revenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
