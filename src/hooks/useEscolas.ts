import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '@/store/filterStore';

export interface EscolaItem {
  escola: string;
  setor: string;
  zona: number;
  qtd_secoes: number;
  secoes: string;
}

export interface PessoalItem {
  lideranca: string;
  funcao: string;
}

export const useEscolas = () => {
  const ano = useFilterStore((state) => state.ano);
  const municipio = useFilterStore((state) => state.municipio);
  const zona = useFilterStore((state) => state.zona);

  return useQuery<{ status: string; total: number; dados: EscolaItem[] }, Error>({
    queryKey: ['escolas', ano, municipio, zona],
    queryFn: async () => {
      const params = new URLSearchParams({ ano: ano.toString() });
      if (municipio) params.append('municipio', municipio);
      if (zona) params.append('zona', zona);
      
      const resp = await fetch(`/api/dados/escolas?${params.toString()}`);
      if (!resp.ok) throw new Error('Falha ao carregar escolas');
      return resp.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useEscolaPessoal = (zona: string | number, secao: string) => {
  const ano = useFilterStore((state) => state.ano);

  return useQuery<{ status: string; total: number; dados: PessoalItem[] }, Error>({
    queryKey: ['escola-pessoal', ano, zona, secao],
    queryFn: async () => {
      const resp = await fetch(`/api/dados/escolas/pessoal?ano=${ano}&zona=${zona}&secao=${secao}`);
      if (!resp.ok) throw new Error('Falha ao carregar pessoal da escola');
      return resp.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!zona && !!secao, 
  });
};
