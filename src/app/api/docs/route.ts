import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  
  const apiDocs = {
    name: 'Trade Management API',
    version: '1.0.0',
    baseUrl,
    endpoints: [
      {
        path: '/trades',
        method: 'GET',
        description: 'Obtém lista de trades com suporte a filtros e paginação',
        parameters: [
          { name: 'all', type: 'boolean', description: 'Se true, retorna todos os trades sem paginação', default: 'false' },
          { name: 'page', type: 'number', description: 'Página atual (começa em 1)', default: '1' },
          { name: 'limit', type: 'number', description: 'Número de itens por página', default: '50' },
          { name: 'idu', type: 'string', description: 'Filtrar por IDU (contém)' },
          { name: 'ativo', type: 'string', description: 'Filtrar por ativo (contém)' },
          { name: 'direcao', type: 'string', description: 'Filtrar por direção (LONG ou SHORT)' },
          { name: 'dataInicio', type: 'date', description: 'Filtrar trades a partir desta data (formato YYYY-MM-DD)' },
          { name: 'dataFim', type: 'date', description: 'Filtrar trades até esta data (formato YYYY-MM-DD)' },
          { name: 'orderBy', type: 'string', description: 'Campo para ordenar resultados', default: 'createdAt' },
          { name: 'order', type: 'string', description: 'Direção da ordenação (asc ou desc)', default: 'desc' }
        ],
        example: `${baseUrl}/trades?page=1&limit=10&ativo=BTC&direcao=LONG&orderBy=data&order=desc`,
        exampleAllParam: `${baseUrl}/trades?all=true&ativo=BTC&orderBy=data&order=desc`
      },
      {
        path: '/trades/:id',
        method: 'GET',
        description: 'Obtém um trade específico por ID',
        parameters: [
          { name: 'id', type: 'number', description: 'ID do trade', required: true }
        ],
        example: `${baseUrl}/trades/1`
      },
      {
        path: '/trades/stats',
        method: 'GET',
        description: 'Obtém estatísticas dos trades',
        parameters: [
          { name: 'ativo', type: 'string', description: 'Filtrar por ativo (contém)' },
          { name: 'direcao', type: 'string', description: 'Filtrar por direção (LONG ou SHORT)' },
          { name: 'dataInicio', type: 'date', description: 'Filtrar trades a partir desta data (formato YYYY-MM-DD)' },
          { name: 'dataFim', type: 'date', description: 'Filtrar trades até esta data (formato YYYY-MM-DD)' }
        ],
        example: `${baseUrl}/trades/stats?ativo=BTC&dataInicio=2023-01-01`
      },
      {
        path: '/trades',
        method: 'POST',
        description: 'Cria um novo trade',
        body: {
          idu: 'string (obrigatório)',
          data: 'string (obrigatório, formato ISO)',
          ativo: 'string (obrigatório)',
          direcao: 'string (obrigatório)',
          percentual: 'number (obrigatório)',
          alvo: 'number (obrigatório)'
        }
      },
      {
        path: '/trades',
        method: 'PUT',
        description: 'Atualiza um trade existente',
        body: {
          id: 'number (obrigatório)',
          idu: 'string (obrigatório)',
          data: 'string (obrigatório, formato ISO)',
          ativo: 'string (obrigatório)',
          direcao: 'string (obrigatório)',
          percentual: 'number (obrigatório)',
          alvo: 'number (obrigatório)'
        }
      },
      {
        path: '/trades',
        method: 'DELETE',
        description: 'Remove um trade',
        parameters: [
          { name: 'id', type: 'number', description: 'ID do trade a ser removido', required: true }
        ],
        example: `${baseUrl}/trades?id=1`
      }
    ]
  }
  
  return NextResponse.json(apiDocs)
} 