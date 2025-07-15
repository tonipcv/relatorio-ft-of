import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Buscar todos os trades ordenados por data
    const trades = await prisma.trade.findMany({
      orderBy: {
        data: 'desc'
      }
    });

    // Agrupar trades por mês/ano
    const tradesPorMes = trades.reduce((acc, trade) => {
      const data = new Date(trade.data);
      const mes = data.getMonth() + 1; // getMonth() retorna 0-11
      const ano = data.getFullYear();
      const chave = `${ano}-${mes.toString().padStart(2, '0')}`;

      if (!acc[chave]) {
        acc[chave] = {
          periodo: {
            mes,
            ano,
            inicio: new Date(ano, mes - 1, 1).toISOString(),
            fim: new Date(ano, mes, 0).toISOString()
          },
          resumo: {
            totalTrades: 0,
            tradesLong: 0,
            tradesShort: 0,
            mediaPercentual: 0,
            mediaAlvo: 0,
            somaPercentual: 0, // auxiliar para cálculo da média
            somaAlvo: 0 // auxiliar para cálculo da média
          },
          ativoCount: {},
          trades: []
        };
      }

      // Atualizar contadores
      acc[chave].resumo.totalTrades++;
      acc[chave].resumo.tradesLong += trade.direcao === 'LONG' ? 1 : 0;
      acc[chave].resumo.tradesShort += trade.direcao === 'SHORT' ? 1 : 0;
      acc[chave].resumo.somaPercentual += trade.percentual;
      acc[chave].resumo.somaAlvo += trade.alvo;

      // Atualizar contagem de ativos
      acc[chave].ativoCount[trade.ativo] = (acc[chave].ativoCount[trade.ativo] || 0) + 1;

      // Adicionar trade à lista
      acc[chave].trades.push(trade);

      return acc;
    }, {} as Record<string, any>);

    // Processar dados finais e ordenar resultados
    const resultado = Object.entries(tradesPorMes).map(([chave, dados]) => {
      // Calcular médias
      dados.resumo.mediaPercentual = dados.resumo.somaPercentual / dados.resumo.totalTrades;
      dados.resumo.mediaAlvo = dados.resumo.somaAlvo / dados.resumo.totalTrades;

      // Remover campos auxiliares
      delete dados.resumo.somaPercentual;
      delete dados.resumo.somaAlvo;

      // Processar ativos mais negociados
      dados.ativosMaisNegociados = Object.entries(dados.ativoCount)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([ativo, count]) => ({ ativo, count }));

      // Remover objeto auxiliar
      delete dados.ativoCount;

      return {
        chave, // formato: "YYYY-MM"
        ...dados
      };
    }).sort((a, b) => b.chave.localeCompare(a.chave)); // Ordenar por data decrescente

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('Error fetching monthly trades:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar trades por mês' 
    }, { status: 500 });
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