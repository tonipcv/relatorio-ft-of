import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }
    
    const trade = await prisma.trade.findUnique({
      where: { id }
    })
    
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }
    
    return NextResponse.json(trade)
  } catch (error) {
    console.error('Error fetching trade:', error)
    return NextResponse.json({ error: 'Error fetching trade' }, { status: 500 })
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