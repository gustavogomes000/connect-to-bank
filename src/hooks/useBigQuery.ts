import { useQuery } from '@tanstack/react-query';
import { listarTabelas, schemaTabela, contarTabela, queryTabela, type BQQueryParams, type BQTabela, type BQColuna, type BQQueryResult } from '@/lib/bigquery';

export function useTabelas() {
  return useQuery<BQTabela[]>({
    queryKey: ['bq-tabelas'],
    queryFn: listarTabelas,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSchema(tabela: string | null) {
  return useQuery<BQColuna[]>({
    queryKey: ['bq-schema', tabela],
    queryFn: () => schemaTabela(tabela!),
    enabled: !!tabela,
    staleTime: 10 * 60 * 1000,
  });
}

export function useContagem(tabela: string | null, filtros?: Record<string, string>) {
  return useQuery<number>({
    queryKey: ['bq-contagem', tabela, filtros],
    queryFn: () => contarTabela(tabela!, filtros),
    enabled: !!tabela,
    staleTime: 2 * 60 * 1000,
  });
}

export function useBQQuery(params: BQQueryParams | null) {
  return useQuery<BQQueryResult>({
    queryKey: ['bq-query', params],
    queryFn: () => queryTabela(params!),
    enabled: !!params?.tabela,
    staleTime: 60 * 1000,
  });
}

export type { BQTabela, BQColuna, BQQueryResult, BQQueryParams };
