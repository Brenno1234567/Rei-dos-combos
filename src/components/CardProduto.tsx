const IMAGEM_PADRAO = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";

export interface CardProdutoProps {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem?: string;
  onClick: () => void;
}

const precoFormatado = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function CardProduto({
  nome,
  descricao,
  preco,
  imagem,
  onClick,
}: CardProdutoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white p-3 rounded-2xl shadow-sm border border-cinza-borda/50 flex gap-3 sm:gap-4 items-stretch sm:items-center min-w-0 w-full h-full text-left cursor-pointer hover:shadow-md hover:border-verde-normal/40 active:scale-[0.99] transition-all duration-200 group"
    >
      {/* Imagem */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-xl shrink-0 overflow-hidden ring-2 ring-transparent group-hover:ring-verde-normal/30 transition-all">
        <img
          src={imagem || IMAGEM_PADRAO}
          alt={nome}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Conteudo */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h3 className="font-bold text-verde-escuro leading-tight truncate group-hover:text-verde-normal transition-colors">
          {nome}
        </h3>
        <p className="text-sm text-cinza-texto line-clamp-2">{descricao}</p>

        <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
          <span className="font-bold text-verde-normal text-sm sm:text-base shrink-0">
            {precoFormatado.format(preco)}
          </span>
        </div>
      </div>
    </button>
  );
}
