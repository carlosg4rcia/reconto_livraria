import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BookOpen, Users, ShoppingCart, TrendingUp } from 'lucide-react'

interface Stats {
  totalBooks: number
  totalCustomers: number
  totalSales: number
  totalRevenue: number
}

interface RecentSale {
  id: string
  created_at: string
  total_amount: number
  customers: { name: string }[] | null
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalRevenue: 0,
  })
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [booksData, customersData, salesData, recentSalesData] = await Promise.all([
        supabase.from('books').select('id', { count: 'exact' }),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('sales').select('total_amount'),
        supabase
          .from('sales')
          .select('id, created_at, total_amount, customers!customer_id(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const totalRevenue = salesData.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0

      setStats({
        totalBooks: booksData.count || 0,
        totalCustomers: customersData.count || 0,
        totalSales: salesData.data?.length || 0,
        totalRevenue,
      })

      setRecentSales((recentSalesData.data || []) as RecentSale[])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Livros',
      value: stats.totalBooks,
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      title: 'Clientes',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-emerald-500',
    },
    {
      title: 'Vendas Realizadas',
      value: stats.totalSales,
      icon: ShoppingCart,
      color: 'bg-amber-500',
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-rose-500',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Vendas Recentes</h2>
        {recentSales.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma venda realizada ainda</p>
        ) : (
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {sale.customers && sale.customers.length > 0 ? sale.customers[0].name : 'Cliente não informado'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(sale.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">
                    R$ {Number(sale.total_amount).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
