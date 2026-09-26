import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ mesa?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const mesa = params.mesa;

  if (mesa) {
    redirect(`/cardapio?mesa=${encodeURIComponent(mesa)}`);
  }

  redirect("/cardapio");
}
