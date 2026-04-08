import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFilterStore } from '@/stores/filterStore';

export interface MesarioRow {
  ano: number;
  turno: number | null;
  municipio: string | null;
  codigo_municipio: string | null;
  zona: number | null;
  tipo_mesario: string | null;
  atividade_eleitoral: string | null;
  genero: string | null;
  estado_civil: string | null;
  faixa_etaria: string | null;
  grau_instrucao: string | null;
  cor_raca: string | null;
  quilombola: string | null;
  interprete_libras: string | null;
  identidade_genero: string | null;
  voluntario: string | null;
  comparecimento: string | null;
  qt_convocados: number | null;
}

export interface FuncaoEspecialRow extends MesarioRow {
  funcao_especial: string | null;
}

/** Mesários do Supabase com filtros globais */
export const useMesarios = () => {
  const ano = useFilterStore((s) => s.ano);
  const municipio = useFilterStore((s) => s.municipio);
  const zona = useFilterStore((s) => s.zona);
  const turno = useFilterStore((s) => s.turno);

  return useQuery({
    queryKey: ['mesarios', ano, municipio, zona, turno],
    queryFn: async () => {
      let query = supabase
        .from('bd_eleicoes_mesarios')
        .select('*')
        .eq('ano', ano)
        .eq('municipio', municipio);

      if (zona) query = query.eq('zona', zona);
      if (turno) query = query.eq('turno', turno);

      const { data, error } = await query.order('qt_convocados', { ascending: false });
      if (error) throw error;
      return (data || []) as MesarioRow[];
    },
    enabled: !!municipio,
    staleTime: 5 * 60 * 1000,
  });
};

/** Funções Especiais do Supabase com filtros globais */
export const useFuncoesEspeciais = () => {
  const ano = useFilterStore((s) => s.ano);
  const municipio = useFilterStore((s) => s.municipio);
  const zona = useFilterStore((s) => s.zona);
  const turno = useFilterStore((s) => s.turno);

  return useQuery({
    queryKey: ['funcoes-especiais', ano, municipio, zona, turno],
    queryFn: async () => {
      let query = supabase
        .from('bd_eleicoes_mesarios_funcoes_especiais')
        .select('*')
        .eq('ano', ano)
        .eq('municipio', municipio);

      if (zona) query = query.eq('zona', zona);
      if (turno) query = query.eq('turno', turno);

      const { data, error } = await query.order('qt_convocados', { ascending: false });
      if (error) throw error;
      return (data || []) as FuncaoEspecialRow[];
    },
    enabled: !!municipio,
    staleTime: 5 * 60 * 1000,
  });
};

/** Estatísticas resumidas dos mesários */
export const useMesariosStats = () => {
  const ano = useFilterStore((s) => s.ano);
  const municipio = useFilterStore((s) => s.municipio);
  const zona = useFilterStore((s) => s.zona);

  return useQuery({
    queryKey: ['mesarios-stats', ano, municipio, zona],
    queryFn: async () => {
      let query = supabase
        .from('bd_eleicoes_mesarios')
        .select('turno, tipo_mesario, genero, faixa_etaria, grau_instrucao, cor_raca, voluntario, comparecimento, qt_convocados')
        .eq('ano', ano)
        .eq('municipio', municipio);

      if (zona) query = query.eq('zona', zona);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!municipio,
    staleTime: 5 * 60 * 1000,
  });
};
