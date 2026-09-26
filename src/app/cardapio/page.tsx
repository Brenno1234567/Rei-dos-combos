"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardapioCliente } from "../../components/CardapioCliente";

function RedirecionadorMesa() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mesaParam = searchParams.get("mesa");
  const numeroMesa = mesaParam?.match(/^Mesa\s+(\d+)$/i)?.[1];

  useEffect(() => {
    if (numeroMesa) {
      router.replace(`/cardapio/mesa-${numeroMesa}`);
    }
  }, [numeroMesa, router]);

  if (numeroMesa) {
    return <div className="min-h-screen bg-fundo flex items-center justify-center text-verde-escuro">Carregando cardápio...</div>;
  }

  return <CardapioCliente />;
}

export default function CardapioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-fundo flex items-center justify-center text-verde-escuro">Carregando cardápio...</div>}>
      <RedirecionadorMesa />
    </Suspense>
  );
}
