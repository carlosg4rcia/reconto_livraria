import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Check, AlertCircle, ExternalLink } from 'lucide-react'

export default function Settings() {
  const [apifyToken, setApifyToken] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [apifyStatus, setApifyStatus] = useState<'active' | 'inactive'>('inactive')

  useEffect(() => {
    const savedToken = localStorage.getItem('apify_token')
    if (savedToken) {
      setApifyToken(savedToken)
      setApifyStatus('active')
    }
  }, [])

  const handleSaveToken = () => {
    if (apifyToken.trim()) {
      localStorage.setItem('apify_token', apifyToken.trim())
      setIsSaved(true)
      setApifyStatus('active')
      setTimeout(() => setIsSaved(false), 3000)
    }
  }

  const handleRemoveToken = () => {
    localStorage.removeItem('apify_token')
    setApifyToken('')
    setApifyStatus('inactive')
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-600 mt-1">Configure as integrações e preferências do sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">APIs de Busca de Livros</h2>
          <p className="text-slate-300 text-sm mt-1">Gerencie as APIs usadas para buscar informações de livros por ISBN</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Como funciona:</p>
                <p className="text-blue-800">
                  O sistema usa a API da Apify para buscar informações de livros diretamente da Amazon Brasil através do ISBN.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${apifyStatus === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Apify API (Amazon)</h3>
                    <p className="text-sm text-slate-600">Busca livros na Amazon Brasil</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {apifyStatus === 'active' ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Configurado</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Não configurado</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Token da API Apify
                </label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={apifyToken}
                    onChange={(e) => setApifyToken(e.target.value)}
                    placeholder="Cole seu token da Apify aqui..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSaveToken}
                    disabled={!apifyToken.trim()}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition font-medium"
                  >
                    Salvar
                  </button>
                  {apifyToken && (
                    <button
                      onClick={handleRemoveToken}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {isSaved && (
                  <div className="mt-3 flex items-center gap-2 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Token salvo com sucesso!</span>
                  </div>
                )}

                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700 mb-2">
                    <strong>Como obter seu token:</strong>
                  </p>
                  <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                    <li>Crie uma conta gratuita na Apify</li>
                    <li>Acesse a página de Integrações</li>
                    <li>Copie seu token de API</li>
                    <li>Cole aqui e clique em Salvar</li>
                  </ol>
                  <a
                    href="https://console.apify.com/account/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                  >
                    Obter token da Apify
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium mb-1">Importante:</p>
            <p>O token da Apify é armazenado localmente no seu navegador. Se você limpar os dados do navegador ou acessar de outro dispositivo, será necessário configurar novamente.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
