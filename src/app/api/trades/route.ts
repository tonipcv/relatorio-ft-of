import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Verificar se o parâmetro 'all' está presente
    const allParam = searchParams.get('all');
    const returnAll = allParam === 'true';
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Parâmetros de filtro
    const idu = searchParams.get('idu');
    const ativo = searchParams.get('ativo');
    const direcao = searchParams.get('direcao');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    
    // Construir filtro
    const where: any = {};
    
    if (idu) {
      where.idu = {
        contains: idu
      };
    }
    
    if (ativo) {
      where.ativo = {
        contains: ativo
      };
    }
    
    if (direcao) {
      where.direcao = direcao;
    }
    
    if (dataInicio || dataFim) {
      where.data = {};
      
      if (dataInicio) {
        where.data.gte = new Date(dataInicio);
      }
      
      if (dataFim) {
        where.data.lte = new Date(dataFim);
      }
    }
    
    // Ordenação
    const orderByClause: any = {};
    orderByClause[orderBy] = order;
    
    if (returnAll) {
      // Se o parâmetro 'all' for true, retorna todos os registros sem paginação
      const trades = await prisma.trade.findMany({
        where,
        orderBy: orderByClause
      });
      
      return NextResponse.json({
        data: trades,
        meta: {
          total: trades.length
        }
      });
    } else {
      // Buscar trades com filtros e paginação
      const [trades, total] = await Promise.all([
        prisma.trade.findMany({
          where,
          orderBy: orderByClause,
          skip,
          take: limit,
        }),
        prisma.trade.count({ where })
      ]);
      
      // Calcular informações de paginação
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      return NextResponse.json({
        data: trades,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        }
      });
    }
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Error fetching trades' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log("POST - Dados recebidos na API:", {
      idu: body.idu,
      data: body.data,
      ativo: body.ativo,
      direcao: body.direcao,
      percentual: body.percentual + "%",
      alvo: body.alvo
    })

    // Check if trade with same idu already exists
    const existingTrade = await prisma.trade.findUnique({
      where: { idu: body.idu }
    })

    if (existingTrade) {
      return NextResponse.json(
        { error: 'Trade with this IDU already exists' },
        { status: 400 }
      )
    }

    const trade = await prisma.trade.create({
      data: {
        idu: body.idu,
        data: new Date(body.data),
        ativo: body.ativo,
        direcao: body.direcao,
        percentual: parseFloat(body.percentual),
        alvo: body.alvo === null || body.alvo === undefined || isNaN(parseFloat(String(body.alvo))) ? 0 : parseFloat(String(body.alvo))
      }
    })
    return NextResponse.json(trade)
  } catch (error) {
    console.error('Error creating trade:', error)
    return NextResponse.json({ error: 'Error creating trade' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, idu, data, ativo, direcao, percentual, alvo } = body

    console.log("PUT - Dados recebidos na API:", {
      id, idu, data, ativo, direcao, 
      percentual: percentual + "%",
      alvo
    })
    
    // Verificação de trades com o mesmo IDU
    const existingTradeWithSameIdu = await prisma.trade.findFirst({
      where: {
        idu,
        id: {
          not: id
        }
      }
    })

    if (existingTradeWithSameIdu) {
      return NextResponse.json(
        { error: `Trade with IDU ${idu} already exists` },
        { status: 400 }
      )
    }

    // Atualiza o trade existente
    const date = new Date(data)
    
    // Certifique-se de que o percentual é um número
    let percentualValue = parseFloat(String(percentual))
    console.log(`API - Percentual sendo armazenado: ${percentualValue}%`)
    
    const updatedTrade = await prisma.trade.update({
      where: { id },
      data: {
        idu,
        data: date,
        ativo,
        direcao,
        percentual: percentualValue,
        alvo: alvo === null || alvo === undefined || isNaN(parseFloat(String(alvo))) ? 0 : parseFloat(String(alvo))
      },
    })

    return NextResponse.json(updatedTrade)
  } catch (error) {
    console.error('Error updating trade:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update trade' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.trade.delete({
      where: { id: parseInt(id) }
    })
    return NextResponse.json({ message: 'Trade deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting trade' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
} 