import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Apenas aplicar CORS a rotas da API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '*'
    
    // Obter a resposta original
    const response = NextResponse.next()
    
    // Adicionar os cabeçalhos CORS
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    return response
  }
  
  return NextResponse.next()
}

// Configurar o middleware para ser executado em todas as rotas da API
export const config = {
  matcher: '/api/:path*',
} 