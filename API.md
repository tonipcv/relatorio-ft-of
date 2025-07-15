# Documentação da API de Trades

## Índice
- [Listar Trades](#listar-trades)
- [Obter Trade por ID](#obter-trade-por-id)
- [Criar Trade](#criar-trade)
- [Atualizar Trade](#atualizar-trade)
- [Deletar Trade](#deletar-trade)
- [Estatísticas](#estatísticas)
- [Trades por Mês](#trades-por-mês)

## Listar Trades

`GET /api/trades`

Lista todos os trades com suporte a filtros e paginação.

### Parâmetros de Query

| Parâmetro   | Tipo    | Descrição                                    | Padrão    |
|-------------|---------|----------------------------------------------|-----------|
| all         | boolean | Se true, retorna todos sem paginação         | false     |
| page        | number  | Página atual                                 | 1         |
| limit       | number  | Itens por página                            | 50        |
| idu         | string  | Filtrar por IDU (contém)                    | -         |
| ativo       | string  | Filtrar por ativo (contém)                  | -         |
| direcao     | string  | Filtrar por direção (LONG/SHORT)           | -         |
| dataInicio  | date    | Filtrar a partir desta data (YYYY-MM-DD)    | -         |
| dataFim     | date    | Filtrar até esta data (YYYY-MM-DD)         | -         |
| orderBy     | string  | Campo para ordenação                        | createdAt |
| order       | string  | Direção da ordenação (asc/desc)            | desc      |

### Exemplo de Resposta

\`\`\`json
{
  "data": [
    {
      "id": 1,
      "idu": "TRADE001",
      "data": "2024-03-28T10:00:00.000Z",
      "ativo": "BTCUSDT",
      "direcao": "LONG",
      "percentual": 1.5,
      "alvo": 2.0,
      "createdAt": "2024-03-28T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
\`\`\`

## Obter Trade por ID

`GET /api/trades/{id}`

Retorna um trade específico pelo ID.

### Exemplo de Resposta

\`\`\`json
{
  "id": 1,
  "idu": "TRADE001",
  "data": "2024-03-28T10:00:00.000Z",
  "ativo": "BTCUSDT",
  "direcao": "LONG",
  "percentual": 1.5,
  "alvo": 2.0,
  "createdAt": "2024-03-28T10:00:00.000Z"
}
\`\`\`

## Criar Trade

`POST /api/trades`

Cria um novo trade.

### Body da Requisição

\`\`\`json
{
  "idu": "TRADE001",
  "data": "2024-03-28T10:00:00.000Z",
  "ativo": "BTCUSDT",
  "direcao": "LONG",
  "percentual": 1.5,
  "alvo": 2.0
}
\`\`\`

### Validações
- IDU deve ser único
- Data deve ser válida
- Direção deve ser "LONG" ou "SHORT"
- Percentual e Alvo devem ser números

## Atualizar Trade

`PUT /api/trades`

Atualiza um trade existente.

### Body da Requisição

\`\`\`json
{
  "id": 1,
  "idu": "TRADE001",
  "data": "2024-03-28T10:00:00.000Z",
  "ativo": "BTCUSDT",
  "direcao": "LONG",
  "percentual": 1.5,
  "alvo": 2.0
}
\`\`\`

## Deletar Trade

`DELETE /api/trades?id={id}`

Remove um trade pelo ID.

## Estatísticas

`GET /api/trades/stats`

Retorna estatísticas dos trades.

### Parâmetros de Query

| Parâmetro  | Tipo   | Descrição                                 |
|------------|--------|-------------------------------------------|
| ativo      | string | Filtrar por ativo                         |
| direcao    | string | Filtrar por direção (LONG/SHORT)         |
| dataInicio | date   | Filtrar a partir desta data (YYYY-MM-DD) |
| dataFim    | date   | Filtrar até esta data (YYYY-MM-DD)      |

### Exemplo de Resposta

\`\`\`json
{
  "totalTrades": 100,
  "mediaPercentual": 1.5,
  "mediaAlvo": 2.0,
  "ativosMaisNegociados": [
    { "ativo": "BTCUSDT", "count": 50 },
    { "ativo": "ETHUSDT", "count": 30 }
  ],
  "distribuicaoDirecao": [
    { "direcao": "LONG", "count": 60 },
    { "direcao": "SHORT", "count": 40 }
  ],
  "estatisticasPorMes": [
    {
      "ano": 2024,
      "mes": 3,
      "totalTrades": 30
    }
  ]
}
\`\`\`

## Trades por Mês

`GET /api/trades/month`

Retorna todos os trades agrupados por mês, com estatísticas para cada período.

### Exemplo de Resposta

\`\`\`json
[
  {
    "chave": "2024-03",
    "periodo": {
      "mes": 3,
      "ano": 2024,
      "inicio": "2024-03-01T00:00:00.000Z",
      "fim": "2024-03-31T23:59:59.999Z"
    },
    "resumo": {
      "totalTrades": 50,
      "tradesLong": 30,
      "tradesShort": 20,
      "mediaPercentual": 1.5,
      "mediaAlvo": 2.0
    },
    "ativosMaisNegociados": [
      { "ativo": "BTCUSDT", "count": 20 },
      { "ativo": "ETHUSDT", "count": 15 }
    ],
    "trades": [
      // Lista de trades do mês
    ]
  }
]
\`\`\`

## Códigos de Erro

| Código | Descrição                                |
|--------|------------------------------------------|
| 400    | Requisição inválida (dados incorretos)   |
| 404    | Recurso não encontrado                   |
| 500    | Erro interno do servidor                 |

## Exemplos de Uso

### Listar Todos os Trades
\`\`\`javascript
fetch('/api/trades?all=true')
  .then(res => res.json())
  .then(data => console.log(data));
\`\`\`

### Criar Novo Trade
\`\`\`javascript
fetch('/api/trades', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    idu: "TRADE001",
    data: new Date().toISOString(),
    ativo: "BTCUSDT",
    direcao: "LONG",
    percentual: 1.5,
    alvo: 2.0
  })
})
.then(res => res.json())
.then(data => console.log(data));
\`\`\`

### Buscar Estatísticas do Mês
\`\`\`javascript
fetch('/api/trades/month')
  .then(res => res.json())
  .then(data => console.log(data));
\`\`\` 