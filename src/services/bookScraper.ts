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

interface GoogleBookResult {
  volumeInfo?: {
    title?: string
    authors?: string[]
    description?: string
    publisher?: string
    publishedDate?: string
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
  }
  saleInfo?: {
    listPrice?: {
      amount?: number
    }
  }
}

function getApifyToken(): string | null {
  return localStorage.getItem('apify_token') || import.meta.env.VITE_APIFY_API_TOKEN || null
}

async function searchWithApify(isbn: string): Promise<BookData | null> {
  const APIFY_TOKEN = getApifyToken()

  if (!APIFY_TOKEN) {
    console.warn('Apify API token not configured')
    return null
  }

  try {
    const searchUrl = `https://www.amazon.com.br/s?k=${isbn}`

    const input = {
      startUrls: [{ url: searchUrl }],
      maxResults: 1,
    }

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
      console.error('Failed to start Apify run')
      return null
    }

    const runData = await runResponse.json()
    const runId = runData.data.id
    const defaultDatasetId = runData.data.defaultDatasetId

    let status = runData.data.status
    while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED') {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/junglee~free-amazon-product-scraper/runs/${runId}?token=${APIFY_TOKEN}`
      )

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        status = statusData.data.status
      } else {
        break
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error('Apify run did not succeed')
      return null
    }

    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}`
    )

    if (!datasetResponse.ok) {
      return null
    }

    const items = await datasetResponse.json()

    if (!items || items.length === 0) {
      return null
    }

    const result = items[0] as ApifyBookResult

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

async function searchWithGoogleBooks(isbn: string): Promise<BookData | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    const book = data.items[0] as GoogleBookResult
    const volumeInfo = book.volumeInfo

    if (!volumeInfo) {
      return null
    }

    const publicationYear = volumeInfo.publishedDate
      ? parseInt(volumeInfo.publishedDate.split('-')[0])
      : undefined

    return {
      title: volumeInfo.title || 'Título Desconhecido',
      author: volumeInfo.authors?.join(', ') || 'Autor Desconhecido',
      isbn,
      description: volumeInfo.description,
      publisher: volumeInfo.publisher,
      publicationYear,
      price: book.saleInfo?.listPrice?.amount,
      coverImage: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail,
    }
  } catch (error) {
    console.error('Error fetching from Google Books:', error)
    return null
  }
}

export async function searchBookByISBN(isbn: string): Promise<BookData | null> {
  const cleanISBN = isbn.replace(/[^0-9X]/gi, '')

  if (cleanISBN.length !== 10 && cleanISBN.length !== 13) {
    throw new Error('ISBN inválido. Deve ter 10 ou 13 dígitos.')
  }

  let bookData = await searchWithGoogleBooks(cleanISBN)

  if (!bookData && getApifyToken()) {
    bookData = await searchWithApify(cleanISBN)
  }

  return bookData
}
