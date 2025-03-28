-- CreateTable
CREATE TABLE "Trade" (
    "id" SERIAL NOT NULL,
    "idu" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "ativo" TEXT NOT NULL,
    "direcao" TEXT NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "alvo" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_idu_key" ON "Trade"("idu");
