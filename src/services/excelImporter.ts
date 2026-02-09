import * as XLSX from 'xlsx'

export interface ExcelBookData {
  titulo?: string
  autor?: string
  isbn?: string
  editora?: string
  ano?: number
  preco?: number
  estoque?: number
  categoria?: string
  descricao?: string
}

export interface ImportResult {
  success: number
  failed: number
  errors: string[]
  books: ExcelBookData[]
}

function parseExcelValue(value: any): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  return isNaN(num) ? undefined : num
}

function parseYear(value: any): number | undefined {
  const num = parseNumber(value)
  if (!num || num < 1000 || num > 2100) return undefined
  return Math.floor(num)
}

export async function parseExcelFile(file: File): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    books: []
  }

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    })

    if (jsonData.length === 0) {
      result.errors.push('Planilha vazia ou sem dados válidos')
      return result
    }

    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i]
      const rowNumber = i + 2

      try {
        const titulo = parseExcelValue(
          row['Título'] ||
          row['TÍTULO'] ||
          row['titulo'] ||
          row['Title'] ||
          row['TITLE']
        )

        const autor = parseExcelValue(
          row['Autor'] ||
          row['AUTOR'] ||
          row['autor'] ||
          row['Author'] ||
          row['AUTHOR']
        )

        if (!titulo && !autor) {
          continue
        }

        if (!titulo) {
          result.failed++
          result.errors.push(`Linha ${rowNumber}: Título obrigatório não encontrado`)
          continue
        }

        if (!autor) {
          result.failed++
          result.errors.push(`Linha ${rowNumber}: Autor obrigatório não encontrado`)
          continue
        }

        const isbn = parseExcelValue(
          row['ISBN'] ||
          row['isbn'] ||
          row['Isbn']
        )

        const editora = parseExcelValue(
          row['Editora'] ||
          row['EDITORA'] ||
          row['editora'] ||
          row['Publisher'] ||
          row['PUBLISHER']
        )

        const categoria = parseExcelValue(
          row['Categoria'] ||
          row['CATEGORIA'] ||
          row['categoria'] ||
          row['Category'] ||
          row['CATEGORY']
        )

        const descricao = parseExcelValue(
          row['Descrição'] ||
          row['DESCRIÇÃO'] ||
          row['descrição'] ||
          row['Descricao'] ||
          row['Description'] ||
          row['DESCRIPTION']
        )

        const ano = parseYear(
          row['Ano'] ||
          row['ANO'] ||
          row['ano'] ||
          row['Ano de Publicação'] ||
          row['Year'] ||
          row['YEAR']
        )

        const preco = parseNumber(
          row['Preço'] ||
          row['PREÇO'] ||
          row['preço'] ||
          row['Preco'] ||
          row['Price'] ||
          row['PRICE']
        )

        const estoque = parseNumber(
          row['Estoque'] ||
          row['ESTOQUE'] ||
          row['estoque'] ||
          row['Quantidade'] ||
          row['Stock'] ||
          row['STOCK']
        )

        const bookData: ExcelBookData = {
          titulo,
          autor,
          isbn: isbn || undefined,
          editora: editora || undefined,
          ano,
          preco,
          estoque: estoque ? Math.floor(estoque) : undefined,
          categoria: categoria || undefined,
          descricao: descricao || undefined
        }

        result.books.push(bookData)
        result.success++
      } catch (error) {
        result.failed++
        result.errors.push(
          `Linha ${rowNumber}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        )
      }
    }

    if (result.books.length === 0) {
      result.errors.push('Nenhum livro válido encontrado na planilha')
    }

  } catch (error) {
    result.errors.push(
      `Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
  }

  return result
}

export function generateExcelTemplate(): void {
  const templateData = [
    {
      'Título': 'Exemplo de Livro',
      'Autor': 'Nome do Autor',
      'ISBN': '9788535902773',
      'Editora': 'Nome da Editora',
      'Ano': 2023,
      'Preço': 49.90,
      'Estoque': 10,
      'Categoria': 'Ficção',
      'Descrição': 'Descrição do livro'
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(templateData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Livros')

  XLSX.writeFile(workbook, 'template_cadastro_livros.xlsx')
}
