import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parâmetros de filtro
    const ativo = searchParams.get('ativo');
    const direcao = searchParams.get('direcao');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    
    // Construir filtro
    const where: any = {};
    
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
    
    // Total de trades
    const totalTrades = await prisma.trade.count({ where });
    
    // Trades agrupados por ativo
    const tradesPorAtivo = await prisma.trade.groupBy({
      by: ['ativo'],
      _count: {
        ativo: true
      },
      where
    });
    
    // Trades agrupados por direção
    const tradesPorDirecao = await prisma.trade.groupBy({
      by: ['direcao'],
      _count: {
        direcao: true
      },
      where
    });
    
    // Média de percentual e alvo
    const aggregations = await prisma.trade.aggregate({
      _avg: {
        percentual: true,
        alvo: true
      },
      where
    });
    
    // Estatísticas por mês
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    
    const dataInicial = new Date(dataInicio || new Date(anoAtual, mesAtual - 5, 1));
    const dataFinal = new Date(dataFim || hoje);
    
    let estatisticasPorMes = [];
    
    // Obter dados de cada mês dentro do período
    let dataAtual = new Date(dataInicial);
    while (dataAtual <= dataFinal) {
      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth();
      
      const primeiroDia = new Date(ano, mes, 1);
      const ultimoDia = new Date(ano, mes + 1, 0);
      
      const tradesNoMes = await prisma.trade.count({
        where: {
          ...where,
          data: {
            gte: primeiroDia,
            lte: ultimoDia
          }
        }
      });
      
      estatisticasPorMes.push({
        ano,
        mes: mes + 1, // Ajuste para mês no formato 1-12
        totalTrades: tradesNoMes
      });
      
      // Avança para o próximo mês
      dataAtual.setMonth(dataAtual.getMonth() + 1);
    }
    
    return NextResponse.json({
      totalTrades,
      mediaPercentual: aggregations._avg.percentual || 0,
      mediaAlvo: aggregations._avg.alvo || 0,
      ativosMaisNegociados: tradesPorAtivo
        .sort((a, b) => b._count.ativo - a._count.ativo)
        .slice(0, 5),
      distribuicaoDirecao: tradesPorDirecao,
      estatisticasPorMes
    });
  } catch (error) {
    console.error('Error fetching trade statistics:', error);
    return NextResponse.json({ error: 'Error fetching trade statistics' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
} 