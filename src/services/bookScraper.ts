export interface BookData {
  title: string
  author: string
  isbn: string
  description?: string
  publisher?: string
  publicationYear?: number
  price?: number
  coverImage?: string
}

interface ApifyBookResult {
  title?: string
  asin?: string
  stars?: string
  description?: string
  images?: Array<{ url?: string }>
  detailBulletPoints?: string[]
  priceDetail?: {
    pricePerUnit?: number
  }
}

function getApifyToken(): string | null {
  return localStorage.getItem('apify_token') || import.meta.env.VITE_APIFY_API_TOKEN || null
}

function convertISBN13to10(isbn13: string): string | null {
  if (isbn13.length !== 13 || !isbn13.startsWith('978')) {
    return null
  }

  const isbn10Base = isbn13.substring(3, 12)
  let sum = 0

  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn10Base[i]) * (10 - i)
  }

  const checkDigit = (11 - (sum % 11)) % 11
  const checkChar = checkDigit === 10 ? 'X' : checkDigit.toString()

  return isbn10Base + checkChar
}

async function searchWithApify(isbn: string, useISBN10: boolean = false): Promise<BookData | null> {
  const APIFY_TOKEN = getApifyToken()

  if (!APIFY_TOKEN) {
    console.warn('Apify API token not configured')
    return null
  }

  try {
    let searchQuery = isbn

    if (useISBN10 && isbn.length === 13) {
      const isbn10 = convertISBN13to10(isbn)
      if (isbn10) {
        searchQuery = isbn10
        console.log(`Convertido ISBN-13 (${isbn}) para ISBN-10 (${isbn10})`)
      }
    }

    const searchUrl = `https://www.amazon.com.br/s?k=${searchQuery}&i=stripbooks`
    console.log(`Buscando na Amazon: ${searchUrl}`)

    const input = {
      categoryUrls: [{ url: searchUrl }],
      maxItems: 5,
      proxyConfiguration: { useApifyProxy: true },
    }

    console.log('Iniciando busca no Apify...')
    const runResponse = await fetch(
      'https://api.apify.com/v2/acts/junglee~free-amazon-product-scraper/runs?token=' + APIFY_TOKEN,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      }
    )

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error('Failed to start Apify run:', errorText)
      return null
    }

    const runData = await runResponse.json()
    const runId = runData.data.id
    const defaultDatasetId = runData.data.defaultDatasetId
    console.log(`Run ID: ${runId}`)

    let status = runData.data.status
    let attempts = 0
    const maxAttempts = 30

    while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000))
      attempts++

      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/junglee~free-amazon-product-scraper/runs/${runId}?token=${APIFY_TOKEN}`
      )

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        status = statusData.data.status
        console.log(`Status da busca: ${status} (tentativa ${attempts}/${maxAttempts})`)
      } else {
        break
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error(`Apify run não foi bem-sucedido. Status final: ${status}`)
      return null
    }

    console.log('Busca concluída! Obtendo resultados...')
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}`
    )

    if (!datasetResponse.ok) {
      console.error('Falha ao obter resultados do dataset')
      return null
    }

    const items = await datasetResponse.json()
    console.log(`Encontrados ${items?.length || 0} resultados`)

    if (!items || items.length === 0) {
      console.warn('Nenhum resultado encontrado')
      return null
    }

    const result = items[0] as ApifyBookResult
    console.log('Primeiro resultado:', result.title)

    let author = 'Autor Desconhecido'
    let publisher = ''
    let publicationYear: number | undefined

    if (result.detailBulletPoints) {
      for (const detail of result.detailBulletPoints) {
        if (detail.includes('Editora:')) {
          const match = detail.match(/Editora:\s*([^;(]+)/)
          if (match) publisher = match[1].trim()
        }
        if (detail.includes('Autor:') || detail.includes('Autores:')) {
          const match = detail.match(/Autores?:\s*(.+)/)
          if (match) author = match[1].trim()
        }
        if (detail.match(/\d{4}/)) {
          const yearMatch = detail.match(/(\d{4})/)
          if (yearMatch) publicationYear = parseInt(yearMatch[1])
        }
      }
    }

    return {
      title: result.title || 'Título Desconhecido',
      author,
      isbn,
      description: result.description,
      publisher: publisher || undefined,
      publicationYear,
      price: result.priceDetail?.pricePerUnit,
      coverImage: result.images?.[0]?.url,
    }
  } catch (error) {
    console.error('Error fetching from Apify:', error)
    return null
  }
}

export async function searchBookByISBN(isbn: string): Promise<BookData | null> {
  const cleanISBN = isbn.replace(/[^0-9X]/gi, '')

  if (cleanISBN.length !== 10 && cleanISBN.length !== 13) {
    throw new Error('ISBN inválido. Deve ter 10 ou 13 dígitos.')
  }

  const APIFY_TOKEN = getApifyToken()

  if (!APIFY_TOKEN) {
    throw new Error('Token da API Apify não configurado. Configure em Configurações.')
  }

  let bookData = await searchWithApify(cleanISBN, false)

  if (!bookData && cleanISBN.length === 13) {
    console.log('Tentando busca com ISBN-10...')
    bookData = await searchWithApify(cleanISBN, true)
  }

  if (!bookData) {
    throw new Error('Livro não encontrado na Amazon.')
  }

  return bookData
}
