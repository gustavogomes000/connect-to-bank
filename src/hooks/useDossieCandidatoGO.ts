import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AnyRow = Record<string, any>;

async function firstExistingTable(candidates: string[]) {
  const errors: string[] = [];
  for (const t of candidates) {
    const { error } = await supabase.from(t as any).select('*', { head: true, count: 'exact' }).limit(1);
    if (!error) return t;
    errors.push(`${t}: ${error.message}`);
  }
  throw new Error(`Nenhuma tabela encontrada. Tentativas: ${errors.join(' | ')}`);
}

export function useCandidatoGO(sqCandidato: string | null) {
  return useQuery({
    queryKey: ['go', 'candidato', sqCandidato],
    enabled: !!sqCandidato,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ table: string; row: AnyRow | null }> => {
      const table = await firstExistingTable(['candidatos_2024_GO', 'candidatos_2024_go']);
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('sq_candidato', sqCandidato!)
        .limit(1);
      if (error) throw new Error(error.message);
      return { table, row: (data?.[0] as AnyRow) || null };
    },
  });
}

export function useBensCandidatoGO(sqCandidato: string | null) {
  return useQuery({
    queryKey: ['go', 'bens', sqCandidato],
    enabled: !!sqCandidato,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ table: string; rows: AnyRow[] }> => {
      const table = await firstExistingTable(['bem_candidato_2024_GO', 'bem_candidato_2024_go', 'bens_candidato_2024_GO']);
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('sq_candidato', sqCandidato!)
        .limit(5000);
      if (error) throw new Error(error.message);
      return { table, rows: (data as AnyRow[]) || [] };
    },
  });
}

export function useReceitasCandidatoGO(sqCandidato: string | null) {
  return useQuery({
    queryKey: ['go', 'receitas', sqCandidato],
    enabled: !!sqCandidato,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ table: string; rows: AnyRow[] }> => {
      const table = await firstExistingTable([
        'receitas_candidato_2024_GO',
        'receitas_candidato_2024_go',
        'receitas_2024_GO',
      ]);
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('sq_candidato', sqCandidato!)
        .limit(5000);
      if (error) throw new Error(error.message);
      return { table, rows: (data as AnyRow[]) || [] };
    },
  });
}

export function useVotacaoSecaoCandidatoGO(
  sqCandidato: string | null,
  opts?: { municipios?: string[]; limit?: number },
) {
  const municipios = opts?.municipios?.length ? opts.municipios : ['GOIÂNIA', 'APARECIDA DE GOIÂNIA'];
  const limit = opts?.limit ?? 20000;

  return useQuery({
    queryKey: ['go', 'votacao_secao', sqCandidato, municipios, limit],
    enabled: !!sqCandidato,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ table: string; rows: AnyRow[] }> => {
      const table = await firstExistingTable([
        'votacao_secao_2024_GO',
        'votacao_secao_2024_go',
        'votacao_secao_GO_2024',
        'votacao_secao_go_2024',
      ]);

      let q = supabase.from(table as any).select('*').eq('sq_candidato', sqCandidato!);
      if (municipios.length) q = q.in('nm_municipio', municipios as any);

      const { data, error } = await q.limit(limit);
      if (error) throw new Error(error.message);
      return { table, rows: (data as AnyRow[]) || [] };
    },
  });
}

