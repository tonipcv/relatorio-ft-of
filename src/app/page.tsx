'use client'

import { NextResponse } from 'next/server'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { read, utils } from 'xlsx'

interface Trade {
  id: number
  idu: string
  data: string
  ativo: string
  direcao: string
  percentual: number
  alvo: number
  createdAt: string
}

interface LogEntry {
  type: 'update' | 'create' | 'error'
  message: string
  timestamp: string
}

interface ColumnMapping {
  idu: string
  data: string
  ativo: string
  direcao: string
  percentual: string
  alvo: string
}

const REQUIRED_FIELDS = ['idu', 'data', 'ativo', 'direcao', 'percentual', 'alvo']

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [formData, setFormData] = useState({
    idu: '',
    data: '',
    ativo: '',
    direcao: '',
    percentual: '',
    alvo: ''
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [csvData, setCsvData] = useState<string[][]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [showMapping, setShowMapping] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    idu: '',
    data: '',
    ativo: '',
    direcao: '',
    percentual: '',
    alvo: ''
  })
  const [percentualMode, setPercentualMode] = useState<'auto' | 'raw' | 'multiply'>('auto')

  useEffect(() => {
    fetchTrades()
  }, [])

  useEffect(() => {
    const filtered = trades.filter(trade => 
      trade.ativo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.direcao.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredTrades(filtered)
  }, [searchTerm, trades])

  const fetchTrades = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/trades?all=true')
      const result = await response.json()
      setTrades(result.data) // Extrair apenas o array 'data' da resposta
    } catch (error) {
      setImportError('Error fetching trades')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccessMessage(null)
    setImportError(null)

    try {
      const url = editingId ? '/api/trades' : '/api/trades'
      const method = editingId ? 'PUT' : 'POST'
      
      const data = editingId 
        ? { ...formData, id: editingId }
        : formData

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      setFormData({
        idu: '',
        data: '',
        ativo: '',
        direcao: '',
        percentual: '',
        alvo: ''
      })
      setEditingId(null)
      setSuccessMessage(editingId ? 'Trade updated successfully!' : 'Trade added successfully!')
      fetchTrades()
    } catch (error) {
      setImportError('Error saving trade')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (trade: Trade) => {
    setFormData({
      idu: trade.idu,
      data: trade.data,
      ativo: trade.ativo,
      direcao: trade.direcao,
      percentual: trade.percentual.toString(),
      alvo: trade.alvo.toString()
    })
    setEditingId(trade.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      setIsLoading(true)
      setSuccessMessage(null)
      setImportError(null)
      
      try {
        await fetch(`/api/trades?id=${id}`, { method: 'DELETE' })
        setSuccessMessage('Trade deleted successfully!')
        fetchTrades()
      } catch (error) {
        setImportError('Error deleting trade')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Iniciando importação de arquivo...")
    const file = e.target.files?.[0]
    if (!file) {
      console.log("Nenhum arquivo selecionado")
      return
    }

    console.log("Arquivo selecionado:", file.name, "Tipo:", file.type)
    setImportError(null)
    setSuccessMessage(null)
    setIsLoading(true)
    
    try {
      let headers: string[] = []
      let data: string[][] = []

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Handle Excel file
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            if (!e.target?.result) {
              throw new Error('Failed to read Excel file')
            }

            const arrayBuffer = e.target.result as ArrayBuffer
            const workbook = read(arrayBuffer, { type: 'array' })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]
            const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
            
            if (jsonData.length > 0) {
              headers = jsonData[0].map(h => String(h).trim())
              data = jsonData.slice(1)
                .filter(row => row.some(cell => cell !== undefined && String(cell).trim() !== ''))
                .map(row => row.map(cell => String(cell || '').trim()))
            }
            
            console.log('Excel Headers:', headers)
            console.log('CSV First Row:', data[0])
            
            setCsvHeaders(headers)
            setCsvData(data)
            
            // Try to auto-map columns
            const autoMapping = autoMapColumns(headers)
            console.log('Auto Mapping:', autoMapping)
            setColumnMapping(autoMapping)
            
            setShowMapping(true)
            setShowMappingModal(true)
            setShowImportModal(false)
            setIsLoading(false)
          } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Error processing Excel file')
            setIsLoading(false)
          }
        }
        reader.onerror = () => {
          setImportError('Error reading Excel file')
          setIsLoading(false)
        }
        reader.readAsArrayBuffer(file)
        return
      } else {
        // Handle CSV file
        const text = await file.text()
        
        // Log para debug
        console.log("CSV raw content (first 100 chars):", text.substring(0, 100))
        
        // Parser de CSV mais robusto que lida com valores entre aspas
        function parseCSV(text: string, delimiter = ',') {
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          const result = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const row = [];
            let cell = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              
              if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
                inQuotes = !inQuotes;
                continue;
              }
              
              if (char === delimiter && !inQuotes) {
                row.push(cell.trim());
                cell = '';
                continue;
              }
              
              cell += char;
              
              if (j === line.length - 1) {
                row.push(cell.trim());
              }
            }
            
            // Garantir que a linha tenha dados válidos
            if (row.length > 0 && row.some(cell => cell.trim().length > 0)) {
              result.push(row);
            }
          }
          
          return result;
        }
        
        // Detectar o delimitador mais provável (vírgula, ponto-e-vírgula, tab)
        const firstLine = text.split(/\r?\n/)[0] || '';
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;
        
        console.log("Contagem de separadores na primeira linha:", {
          comma: commaCount,
          semicolon: semicolonCount,
          tab: tabCount
        });
        
        let delimiter = ','; // Default
        if (semicolonCount > commaCount && semicolonCount > tabCount) {
          delimiter = ';';
          console.log("Usando separador: ponto-e-vírgula");
        } else if (tabCount > commaCount && tabCount > semicolonCount) {
          delimiter = '\t';
          console.log("Usando separador: tabulação");
        } else {
          console.log("Usando separador: vírgula");
        }
        
        // Parse CSV com o parser robusto
        const parsedCSV = parseCSV(text, delimiter);
        
        if (parsedCSV.length < 2) {
          throw new Error('CSV inválido ou vazio. Verifique o formato do arquivo.');
        }
        
        headers = parsedCSV[0].map(h => String(h).trim());
        data = parsedCSV.slice(1);
        
        console.log('CSV Headers:', headers);
        console.log('CSV First Row:', data[0]);
        console.log('CSV Total Rows:', data.length);
        
        setCsvHeaders(headers)
        setCsvData(data)
        
        // Try to auto-map columns
        const autoMapping = autoMapColumns(headers)
        console.log('Auto Mapping:', autoMapping)
        setColumnMapping(autoMapping)
        
        setShowMapping(true)
        setShowMappingModal(true)
        setShowImportModal(false)
      }
      
      e.target.value = ''
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Error reading file')
      e.target.value = ''
    } finally {
      setIsLoading(false)
    }
  }

  const autoMapColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      idu: '',
      data: '',
      ativo: '',
      direcao: '',
      percentual: '',
      alvo: ''
    }

    // Define possible variations for each field
    const fieldVariations: Record<keyof ColumnMapping, string[]> = {
      idu: ['idu', 'id', 'identificador', 'identifier'],
      data: ['data', 'date', 'data operacao', 'operation date'],
      ativo: ['ativo', 'symbol', 'par', 'pair', 'asset'],
      direcao: ['direcao', 'direction', 'dir', 'tipo', 'type'],
      percentual: ['percentual', 'percentage', 'perc', 'variação', 'variation'],
      alvo: ['alvo', 'target', 'objetivo', 'goal']
    }

    // Try to match each header with possible variations
    headers.forEach(header => {
      const headerLower = header.toLowerCase()
      Object.entries(fieldVariations).forEach(([field, variations]) => {
        if (variations.some(variation => headerLower.includes(variation.toLowerCase()))) {
          mapping[field as keyof ColumnMapping] = header
        }
      })
    })

    return mapping
  }

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImportWithMapping = async () => {
    setIsLoading(true)
    setImportError(null)
    setSuccessMessage(null)

    try {
      // Validate mapping
      const missingFields = REQUIRED_FIELDS.filter(field => !columnMapping[field as keyof ColumnMapping])
      if (missingFields.length > 0) {
        throw new Error(`Please map all required fields: ${missingFields.join(', ')}`)
      }

      // Log the mapping for debugging
      console.log('Column Mapping:', columnMapping)
      console.log('CSV Headers:', csvHeaders)
      console.log('First row of data:', csvData[0])

      console.log('Iniciando processamento das linhas. Total:', csvData.length);
      console.log('Mapeamento de colunas:', columnMapping);
      console.log('Headers disponíveis:', csvHeaders);

      // Validar se todas as colunas foram mapeadas
      const missingMappings = REQUIRED_FIELDS.filter(field => !columnMapping[field as keyof ColumnMapping]);
      if (missingMappings.length > 0) {
        throw new Error(`As seguintes colunas não foram mapeadas: ${missingMappings.join(', ')}`);
      }

      // Filtrar linhas vazias
      const validRows = csvData.filter(row => row.some(cell => cell !== undefined && cell.trim() !== ''));
      console.log(`Linhas válidas encontradas: ${validRows.length} de ${csvData.length}`);

      const trades = validRows.map((row, index) => {
        console.log(`\nProcessando linha ${index + 1}:`, row);
        
        // Verificar se a linha tem dados suficientes
        if (!row || row.length === 0) {
          console.error(`Linha ${index + 1} está vazia ou inválida:`, row);
          throw new Error(`Linha ${index + 1} está vazia ou inválida`);
        }
        
        const trade: any = {}
        REQUIRED_FIELDS.forEach(field => {
          const mappedColumn = columnMapping[field as keyof ColumnMapping];
          const headerIndex = csvHeaders.indexOf(mappedColumn);
          
          console.log(`Campo ${field}:`, {
            colunaMapeada: mappedColumn,
            indiceHeader: headerIndex,
            valorEncontrado: headerIndex !== -1 ? row[headerIndex] : 'não encontrado'
          });
          
          if (headerIndex === -1) {
            throw new Error(`Coluna "${mappedColumn}" não encontrada nos headers do CSV. Headers disponíveis: ${csvHeaders.join(', ')}`)
          }
          trade[field] = row[headerIndex]
        })

        // Log do objeto trade completo
        console.log(`Linha ${index + 1} dados processados:`, trade);

        // Handle IDU - ensure it's a string and not empty
        const iduValue = String(trade.idu || '').trim()
        if (!iduValue || iduValue === '-') {
          throw new Error(`Invalid IDU value in row ${index + 1}: ${trade.idu} (raw value: ${JSON.stringify(trade.idu)})`)
        }

        // Handle empty or "-" values for other fields
        const ativoValue = String(trade.ativo || '').trim();
        if (!ativoValue || ativoValue === '-') {
          console.error(`Erro na linha ${index + 1}: Ativo vazio ou inválido`, trade);
          throw new Error(`Ativo não pode estar vazio na linha ${index + 1}. Valor encontrado: "${ativoValue}"`);
        }
        trade.ativo = ativoValue;

        const direcaoValue = String(trade.direcao || '').trim().toUpperCase();
        if (!direcaoValue || direcaoValue === '-') {
          console.error(`Erro na linha ${index + 1}: Direção vazia ou inválida`, trade);
          throw new Error(`Direção não pode estar vazia na linha ${index + 1}. Valor encontrado: "${direcaoValue}"`);
        }
        trade.direcao = direcaoValue;

        if (!['LONG', 'SHORT'].includes(String(trade.direcao).toUpperCase())) {
          throw new Error('Direção must be either LONG or SHORT')
        }

        // Handle different date formats
        let date: Date
        if (typeof trade.data === 'string') {
          if (!trade.data || String(trade.data).trim() === '' || String(trade.data).trim() === '-') {
            throw new Error('Data cannot be empty')
          }

          const dateStr = String(trade.data).trim()
          
          // Try different date formats
          if (dateStr.includes('/')) {
            // Format: DD/MM/YYYY
            const [day, month, year] = dateStr.split('/')
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          } else if (dateStr.includes('-')) {
            // Format: YYYY-MM-DD
            date = new Date(dateStr)
          } else {
            // Try parsing as Excel date number
            const excelDate = parseFloat(dateStr)
            if (!isNaN(excelDate)) {
              // Excel dates are number of days since 1900-01-01
              date = new Date(1900, 0, excelDate - 1)
            } else {
              throw new Error('Invalid date format')
            }
          }

          // Validate the date
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${dateStr}`)
          }

          // Set time to midnight to avoid timezone issues
          date.setHours(0, 0, 0, 0)
        } else {
          // If it's already a Date object
          date = new Date(trade.data)
          date.setHours(0, 0, 0, 0)
        }

        // Handle percentual format (X,XX = XX%)
        let percentual: number
        if (typeof trade.percentual === 'string') {
          if (!trade.percentual || String(trade.percentual).trim() === '' || String(trade.percentual).trim() === '-') {
            percentual = 0
          } else {
            try {
              // Guarda o valor original para mensagens de erro
              const originalValue = String(trade.percentual).trim();
              
              console.log(`Processando percentual CSV: "${originalValue}"`);
              
              // Remover aspas extras, se existirem
              let valueWithoutQuotes = originalValue.replace(/^"|"$/g, '').trim();
              console.log(`CSV: Valor sem aspas: "${valueWithoutQuotes}"`);
              
              // Para valores simples como "0" ou "0%"
              if (valueWithoutQuotes === "0" || valueWithoutQuotes === "0%") {
                percentual = 0;
                console.log(`CSV: Valor zero detectado: "${valueWithoutQuotes}" -> 0%`);
              } else {
                // Remove possíveis símbolos de porcentagem
                let cleanPercentual = valueWithoutQuotes.replace(/%/g, '').trim();
                
                // Verifica se é formato brasileiro (com vírgula como separador decimal)
                if (cleanPercentual.includes(',')) {
                  // Preserva o sinal negativo, se existir
                  const isNegative = cleanPercentual.startsWith('-');
                  // Remove o sinal para processamento e depois adiciona novamente
                  if (isNegative) {
                    cleanPercentual = cleanPercentual.substring(1);
                  }
                  
                  // Converte de formato brasileiro para americano
                  cleanPercentual = cleanPercentual.replace(/\./g, '').replace(',', '.');
                  
                  // Converte para número
                  let value = parseFloat(cleanPercentual);
                  
                  if (!isNaN(value)) {
                    // Aplica a multiplicação com base no modo selecionado
                    if (percentualMode === 'multiply' || (percentualMode === 'auto' && value < 1)) {
                      value = value * 100;
                      console.log(`CSV: Convertendo percentual: "${originalValue}" -> ${value}%`);
                    } else {
                      console.log(`CSV: Mantendo percentual: "${originalValue}" -> ${value}%`);
                    }
                    
                    // Reaplica o sinal negativo se necessário
                    if (isNegative) {
                      value = -value;
                    }
                    
                    percentual = value;
                  } else {
                    throw new Error(`Formato de percentual inválido: ${originalValue}`);
                  }
                } else {
                  // Para formato com ponto decimal ou sem decimal
                  percentual = parseFloat(cleanPercentual);
                  
                  // Aplica a multiplicação com base no modo selecionado
                  if (!isNaN(percentual)) {
                    if (percentualMode === 'multiply' || (percentualMode === 'auto' && Math.abs(percentual) > 0 && Math.abs(percentual) < 1)) {
                      percentual = percentual * 100;
                      console.log(`CSV: Convertendo percentual formato americano: "${originalValue}" -> ${percentual}%`);
                    } else {
                      console.log(`CSV: Mantendo percentual formato americano: "${originalValue}" -> ${percentual}%`);
                    }
                  }
                }
              }
              
              // Validação final do valor numérico
              if (isNaN(percentual)) {
                throw new Error(`Formato de percentual inválido: ${originalValue}`);
              }
              
              // Este log vai mostrar os valores finais para depuração
              console.log(`CSV: Percentual final: Original="${originalValue}", Processado=${percentual}%`);
            } catch (error) {
              console.error(`Erro ao processar percentual CSV: "${trade.percentual}"`, error);
              throw new Error(`Erro ao processar percentual CSV: "${trade.percentual}" - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
          }
        } else if (typeof trade.percentual === 'number') {
          percentual = trade.percentual;
          
          // Aplica a multiplicação com base no modo selecionado para números
          if (percentualMode === 'multiply' || (percentualMode === 'auto' && Math.abs(percentual) > 0 && Math.abs(percentual) < 1)) {
            percentual = percentual * 100;
          }
          
          console.log(`CSV: Percentual já é número: ${percentual}%`);
        } else {
          percentual = 0;
          console.warn(`CSV: Tipo de percentual desconhecido: ${typeof trade.percentual}. Usando 0%`);
        }

        // Handle alvo format (should be a number)
        let alvo: number
        if (typeof trade.alvo === 'string') {
          if (!trade.alvo || String(trade.alvo).trim() === '' || String(trade.alvo).trim() === '-') {
            alvo = 0
          } else {
            // Replace comma with dot if present
            const cleanAlvo = String(trade.alvo).replace(',', '.')
            alvo = parseFloat(cleanAlvo)
            if (isNaN(alvo)) {
              throw new Error(`Invalid alvo format: ${trade.alvo}. Expected format: number`)
            }
          }
        } else {
          alvo = parseFloat(String(trade.alvo))
        }

        return {
          idu: iduValue,
          data: date.toISOString(),
          ativo: String(trade.ativo),
          direcao: String(trade.direcao).toUpperCase(),
          percentual,
          alvo
        }
      })

      // Get existing trades to check for duplicates
      const response = await fetch('/api/trades?all=true')
      const result = await response.json()
      const existingTrades = result.data // Extrair o array 'data' da resposta
      const existingIdus = new Set(existingTrades.map((t: Trade) => t.idu))

      let updatedCount = 0
      let createdCount = 0

      for (const trade of trades) {
        try {
          if (existingIdus.has(trade.idu)) {
            // Find the existing trade to get its ID
            const existingTrade = existingTrades.find((t: Trade) => t.idu === trade.idu)
            if (existingTrade) {
              // Log the changes with a clear visual comparison
              console.log('\n' + '='.repeat(50))
              console.log(`🔄 Atualizando Trade IDU: ${trade.idu}`)
              console.log('-'.repeat(50))
              console.log('ANTES:')
              console.log(JSON.stringify({
                idu: existingTrade.idu,
                data: new Date(existingTrade.data).toLocaleString(),
                ativo: existingTrade.ativo,
                direcao: existingTrade.direcao,
                percentual: existingTrade.percentual + '%',
                alvo: existingTrade.alvo
              }, null, 2))
              console.log('-'.repeat(50))
              console.log('DEPOIS:')
              console.log(JSON.stringify({
                idu: trade.idu,
                data: new Date(trade.data).toLocaleString(),
                ativo: trade.ativo,
                direcao: trade.direcao,
                percentual: trade.percentual + '%',
                alvo: trade.alvo
              }, null, 2))
              console.log('='.repeat(50) + '\n')

              // Update existing trade
              const response = await fetch('/api/trades', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...trade,
                  id: existingTrade.id,
                  data: new Date(trade.data).toISOString(),
                  percentual: Number(trade.percentual)
                })
              })
              
              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Failed to update trade with IDU: ${trade.idu}`)
              }
              
              updatedCount++
              console.log('✅ Atualização concluída com sucesso!')
            }
          } else {
            // Log the new trade with a clear visual format
            console.log('\n' + '='.repeat(50))
            console.log(`✨ Criando novo Trade IDU: ${trade.idu}`)
            console.log('-'.repeat(50))
            console.log('NOVO TRADE:')
            console.log(JSON.stringify({
              idu: trade.idu,
              data: new Date(trade.data).toLocaleString(),
              ativo: trade.ativo,
              direcao: trade.direcao,
              percentual: trade.percentual + '%',
              alvo: trade.alvo
            }, null, 2))
            console.log('='.repeat(50) + '\n')

            // Create new trade
            const response = await fetch('/api/trades', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...trade,
                data: new Date(trade.data).toISOString(),
                percentual: Number(trade.percentual)
              })
            })
            
            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || `Failed to create trade with IDU: ${trade.idu}`)
            }
            
            createdCount++
            console.log('✅ Criação concluída com sucesso!')
          }
        } catch (error) {
          console.error(`❌ Erro ao processar trade com IDU ${trade.idu}:`, error)
          throw error
        }
      }

      setSuccessMessage(`${createdCount} trades created and ${updatedCount} trades updated successfully!`)
      setShowMapping(false)
      setShowMappingModal(false)
      setCsvData([])
      setCsvHeaders([])
      setColumnMapping({
        idu: '',
        data: '',
        ativo: '',
        direcao: '',
        percentual: '',
        alvo: ''
      })
      fetchTrades()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Error importing CSV file')
    } finally {
      setIsLoading(false)
    }
  }

  const processPercentual = (value: string): string => {
    if (!value || value.trim() === '' || value.trim() === '-') {
      return '0%';
    }
    
    // Remover aspas extras, se existirem
    let valueWithoutQuotes = value.replace(/^"|"$/g, '').trim();
    
    // Para valores simples como "0" ou "0%"
    if (valueWithoutQuotes === "0" || valueWithoutQuotes === "0%") {
      return '0%';
    }
    
    // Remove possíveis símbolos de porcentagem
    let cleanPercentual = valueWithoutQuotes.replace(/%/g, '').trim();
    
    // Verifica se é formato brasileiro (com vírgula como separador decimal)
    if (cleanPercentual.includes(',')) {
      // Preserva o sinal negativo, se existir
      const isNegative = cleanPercentual.startsWith('-');
      // Remove o sinal para processamento e depois adiciona novamente
      if (isNegative) {
        cleanPercentual = cleanPercentual.substring(1);
      }
      
      // Converte de formato brasileiro para americano
      cleanPercentual = cleanPercentual.replace(/\./g, '').replace(',', '.');
      
      // Converte para número
      let value = parseFloat(cleanPercentual);
      
      if (!isNaN(value)) {
        // Aplica a multiplicação com base no modo selecionado
        if (percentualMode === 'multiply' || (percentualMode === 'auto' && value < 1)) {
          value = value * 100;
        }
        
        // Reaplica o sinal negativo se necessário
        if (isNegative) {
          value = -value;
        }
        
        return value + '%';
      }
    }
    
    // Para formato com ponto decimal ou sem decimal
    const numValue = parseFloat(cleanPercentual);
    if (!isNaN(numValue)) {
      // Aplica a multiplicação com base no modo selecionado
      if (percentualMode === 'multiply' || (percentualMode === 'auto' && numValue > 0 && numValue < 1)) {
        return (numValue * 100) + '%';
      }
      return numValue + '%';
    }
    
    return 'Erro';
  }

  // Modal component
  const TradeModal = () => {
    if (!showTradeModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
          
          {/* Center modal */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            {/* Modal content */}
            <div className="bg-white">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Editar Trade' : 'Adicionar Trade'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowTradeModal(false)
                    setEditingId(null)
                    setFormData({
                      idu: '',
                      data: '',
                      ativo: '',
                      direcao: '',
                      percentual: '',
                      alvo: ''
                    })
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IDU</label>
                    <input
                      type="text"
                      value={formData.idu}
                      onChange={(e) => setFormData({ ...formData, idu: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                      disabled={isLoading || !!editingId}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input
                      type="datetime-local"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ativo</label>
                    <input
                      type="text"
                      value={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Direção</label>
                    <select
                      value={formData.direcao}
                      onChange={(e) => setFormData({ ...formData, direcao: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                      disabled={isLoading}
                    >
                      <option value="">Selecione</option>
                      <option value="LONG">LONG</option>
                      <option value="SHORT">SHORT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentual</label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.percentual}
                        onChange={(e) => setFormData({ ...formData, percentual: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 pr-8"
                        required
                        disabled={isLoading}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alvo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.alvo}
                      onChange={(e) => setFormData({ ...formData, alvo: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingId ? 'Atualizando...' : 'Adicionando...'}
                      </>
                    ) : (
                      editingId ? 'Atualizar Trade' : 'Adicionar Trade'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTradeModal(false)
                      setEditingId(null)
                      setFormData({
                        idu: '',
                        data: '',
                        ativo: '',
                        direcao: '',
                        percentual: '',
                        alvo: ''
                      })
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal component para selecionar arquivo
  const ImportFileModal = () => {
    if (!showImportModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
          
          {/* Center modal */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            {/* Modal content */}
            <div className="bg-white">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Importar Arquivo</h3>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-6">Selecione um arquivo CSV ou Excel para importar.</p>
                
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Clique para selecionar um arquivo</p>
                  <p className="mt-1 text-xs text-gray-400">(CSV, XLS, XLSX)</p>
                  
                  <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none cursor-pointer">
                    Selecionar Arquivo
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleCSVImport}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                </div>
                
                {isLoading && (
                  <div className="mt-4">
                    <div className="flex justify-center items-center">
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-2 text-sm text-gray-600">Processando arquivo...</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      Por favor, aguarde enquanto processamos seu arquivo.
                      <br />
                      Isso pode levar alguns segundos.
                    </div>
                  </div>
                )}
                {importError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Erro ao processar arquivo</h3>
                        <div className="mt-2 text-sm text-red-700">{importError}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal component para mapeamento de colunas
  const MappingModal = () => {
    if (!showMappingModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
          
          {/* Center modal */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
            {/* Modal content */}
            <div className="bg-white">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Mapeamento de Colunas</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowMappingModal(false)
                    setShowMapping(false)
                    setCsvData([])
                    setCsvHeaders([])
                    setColumnMapping({
                      idu: '',
                      data: '',
                      ativo: '',
                      direcao: '',
                      percentual: '',
                      alvo: ''
                    })
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="px-6 py-4">
                <p className="text-sm text-gray-500 mb-4">Associe as colunas do arquivo às propriedades necessárias.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {REQUIRED_FIELDS.map((field) => (
                    <div key={field} className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field}
                      </label>
                      <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        value={columnMapping[field as keyof ColumnMapping] || ''}
                        onChange={(e) => handleMappingChange(field as keyof ColumnMapping, e.target.value)}
                      >
                        <option value="">Selecione uma coluna</option>
                        {csvHeaders.map((header, index) => (
                          <option key={index} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                
                {/* Preview Section - Display sample data for each mapped column */}
                <div className="mt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Visualização dos Dados (primeiras 3 linhas)</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Coluna CSV</th>
                          <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Campo</th>
                          {[0, 1, 2].map((index) => (
                            csvData.length > index && (
                              <th key={index} scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">
                                Linha {index + 1}
                              </th>
                            )
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {csvHeaders.map((header, headerIndex) => {
                          // Encontrar qual campo está mapeado para este cabeçalho
                          const mappedField = Object.entries(columnMapping).find(([_, val]) => val === header)?.[0];
                          
                          return (
                            <tr key={headerIndex} className={
                              mappedField === 'percentual' || mappedField === 'alvo' 
                                ? 'bg-yellow-50' 
                                : headerIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                {header}
                              </td>
                              <td className={`whitespace-nowrap py-4 px-3 text-sm ${
                                mappedField ? 'font-bold text-blue-600' : 'text-gray-500'
                              }`}>
                                {mappedField || '-'}
                              </td>
                              {[0, 1, 2].map((rowIndex) => (
                                csvData.length > rowIndex && (
                                  <td key={rowIndex} className={`whitespace-nowrap py-4 px-3 text-sm ${
                                    mappedField === 'percentual' || mappedField === 'alvo' 
                                      ? 'font-semibold text-gray-900' 
                                      : 'text-gray-500'
                                  }`}>
                                    {csvData[rowIndex][headerIndex] || '-'}
                                    {mappedField === 'percentual' && csvData[rowIndex][headerIndex] && (
                                      <span className="ml-1 text-green-600">
                                        ({processPercentual(csvData[rowIndex][headerIndex])})
                                      </span>
                                    )}
                                  </td>
                                )
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Verifique o mapeamento e interpretação dos valores:</h4>
                    <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
                      <li><strong>percentual</strong>: Como os valores devem ser interpretados?</li>
                    </ul>
                    
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center">
                        <input
                          id="percentual-auto"
                          name="percentual-mode"
                          type="radio"
                          checked={percentualMode === 'auto'}
                          onChange={() => setPercentualMode('auto')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="percentual-auto" className="ml-2 block text-sm text-gray-700">
                          Automático (valores &lt; 1 multiplicados por 100, ex: 0,20 → 20%, 1,5 → 1,5%)
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="percentual-raw"
                          name="percentual-mode"
                          type="radio"
                          checked={percentualMode === 'raw'}
                          onChange={() => setPercentualMode('raw')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="percentual-raw" className="ml-2 block text-sm text-gray-700">
                          Literal (valores exatos, ex: 0,20 → 0,2%, 1,5 → 1,5%)
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="percentual-multiply"
                          name="percentual-mode"
                          type="radio"
                          checked={percentualMode === 'multiply'}
                          onChange={() => setPercentualMode('multiply')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="percentual-multiply" className="ml-2 block text-sm text-gray-700">
                          Multiplicar tudo por 100 (ex: 0,20 → 20%, 1,5 → 150%, 2,6 → 260%)
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    Total de linhas no arquivo: {csvData.length}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    setShowMappingModal(false)
                    setShowMapping(false)
                    setCsvData([])
                    setCsvHeaders([])
                    setColumnMapping({
                      idu: '',
                      data: '',
                      ativo: '',
                      direcao: '',
                      percentual: '',
                      alvo: ''
                    })
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={handleImportWithMapping}
                  disabled={isLoading}
                >
                  {isLoading ? 'Importando...' : 'Importar Dados'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add modal components */}
      <TradeModal />
      <ImportFileModal />
      <MappingModal />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Trade Management</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTradeModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar Trade
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar Arquivo
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {importError && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{importError}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Trades</h2>
              <div className="w-64">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by Ativo or Direção..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <svg className="animate-spin mx-auto h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2 text-gray-600">Loading trades...</p>
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No trades found
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">IDU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Ativo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Direção</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Percentual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Alvo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.idu}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(trade.data).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.ativo}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trade.direcao === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.direcao}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.percentual}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.alvo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEdit(trade)}
                          className="text-blue-600 hover:text-blue-900 mr-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(trade.id)}
                          className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
