import { notFound } from "next/navigation";
import { CardapioCliente } from "../../../components/CardapioCliente";

export default async function CardapioPorMesa({ params }: { params: Promise<{ mesa: string }> }) {
  const { mesa } = await params;
  const resultado = /^mesa-(\d{1,3})$/i.exec(mesa);

  if (!resultado) notFound();

  return <CardapioCliente mesa={`Mesa ${resultado[1]}`} />;
}
