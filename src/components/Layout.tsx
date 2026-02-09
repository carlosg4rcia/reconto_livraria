import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut
} from 'lucide-react'

export default function Layout() {
  const { signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Livros', href: '/books', icon: BookOpen },
    { name: 'Categorias', href: '/categories', icon: FolderOpen },
    { name: 'Clientes', href: '/customers', icon: Users },
    { name: 'Vendas', href: '/sales', icon: ShoppingCart },
    { name: 'Relatórios', href: '/reports', icon: BarChart3 },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed top-0 left-0 h-full w-64 bg-slate-900 text-white">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="font-bold text-lg">Reconto</h1>
              <p className="text-xs text-gray-400">Gestão de Livraria</p>
            </div>
          </div>
        </div>

        <nav className="p-4 flex-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-300 hover:bg-slate-800 transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  )
}
