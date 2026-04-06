import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const TABELA_CANDIDATOS = 'bd_eleicoes_candidatos' as any;
const TABELA_VOTACAO = 'bd_eleicoes_votacao' as any;
const TABELA_COMPARECIMENTO = 'bd_eleicoes_comparecimento' as any;
const TABELA_COMPARECIMENTO_SECAO = 'bd_eleicoes_comparecimento_secao' as any;
const TABELA_BENS = 'bd_eleicoes_bens_candidatos' as any;

async function fetchAll(baseQuery: any, pageSize = 1000) {
  const results: any[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await baseQuery.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return results;
}

// KPIs por cidade
export function useCidadeKPIs(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['cidadeKPIs', municipio, ano],
    queryFn: async () => {
      let cq = (supabase.from(TABELA_CANDIDATOS) as any)
        .select('id, cargo, sigla_partido, genero, situacao_final, grau_instrucao, ocupacao')
        .eq('municipio', municipio);
      if (ano) cq = cq.eq('ano', ano);
      const cands = await fetchAll(cq);

      let compQ = (supabase.from(TABELA_COMPARECIMENTO) as any)
        .select('eleitorado_apto, comparecimento, abstencoes, votos_brancos, votos_nulos')
        .eq('municipio', municipio);
      if (ano) compQ = compQ.eq('ano', ano);
      const comp = await fetchAll(compQ);

      const totalCandidatos = cands.length;
      const eleitos = cands.filter((c: any) => {
        const s = (c.situacao_final || '').toUpperCase();
        return (s.includes('ELEITO') || s.includes('MÉDIA') || s.includes('QP')) && !s.includes('NÃO ELEITO');
      }).length;
      const mulheres = cands.filter((c: any) => (c.genero || '').toUpperCase() === 'FEMININO').length;
      const partidos = new Set(cands.map((c: any) => c.sigla_partido).filter(Boolean)).size;
      const cargos = new Set(cands.map((c: any) => c.cargo).filter(Boolean)).size;

      const totalApto = comp.reduce((s: number, r: any) => s + (r.eleitorado_apto || 0), 0);
      const totalComp = comp.reduce((s: number, r: any) => s + (r.comparecimento || 0), 0);
      const totalAbst = comp.reduce((s: number, r: any) => s + (r.abstencoes || 0), 0);
      const totalBrancos = comp.reduce((s: number, r: any) => s + (r.votos_brancos || 0), 0);
      const totalNulos = comp.reduce((s: number, r: any) => s + (r.votos_nulos || 0), 0);

      return { totalCandidatos, eleitos, mulheres, partidos, cargos, totalApto, totalComp, totalAbst, totalBrancos, totalNulos };
    },
    enabled: !!municipio,
  });
}

// Top candidatos mais votados na cidade
export function useTopVotadosCidade(municipio: string, ano: number | null, cargo: string | null) {
  return useQuery({
    queryKey: ['topVotadosCidade', municipio, ano, cargo],
    queryFn: async () => {
      let q = (supabase.from(TABELA_VOTACAO) as any)
        .select('nome_candidato, partido, cargo, total_votos, numero_urna, zona')
        .eq('municipio', municipio);
      if (ano) q = q.eq('ano', ano);
      if (cargo) q = q.ilike('cargo', cargo);
      const data = await fetchAll(q);
      
      // Agregar por candidato (somar zonas)
      const map = new Map<string, { nome: string; partido: string; cargo: string; numero: number; votos: number; zonas: Set<number> }>();
      data.forEach((r: any) => {
        const key = `${r.nome_candidato}|${r.cargo}`;
        const cur = map.get(key) || { nome: r.nome_candidato, partido: r.partido || '', cargo: r.cargo || '', numero: r.numero_urna || 0, votos: 0, zonas: new Set() };
        cur.votos += r.total_votos || 0;
        if (r.zona) cur.zonas.add(r.zona);
        map.set(key, cur);
      });
      
      return Array.from(map.values())
        .map(v => ({ ...v, zonas: v.zonas.size }))
        .sort((a, b) => b.votos - a.votos);
    },
    enabled: !!municipio,
  });
}

// Votação por zona (comparar zonas)
export function useVotacaoZonaCidade(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['votacaoZonaCidade', municipio, ano],
    queryFn: async () => {
      let q = (supabase.from(TABELA_COMPARECIMENTO) as any)
        .select('zona, eleitorado_apto, comparecimento, abstencoes, votos_brancos, votos_nulos')
        .eq('municipio', municipio);
      if (ano) q = q.eq('ano', ano);
      const data = await fetchAll(q);
      const map = new Map<number, { zona: number; apto: number; comp: number; abst: number; brancos: number; nulos: number }>();
      data.forEach((r: any) => {
        const z = r.zona || 0;
        const cur = map.get(z) || { zona: z, apto: 0, comp: 0, abst: 0, brancos: 0, nulos: 0 };
        cur.apto += r.eleitorado_apto || 0;
        cur.comp += r.comparecimento || 0;
        cur.abst += r.abstencoes || 0;
        cur.brancos += r.votos_brancos || 0;
        cur.nulos += r.votos_nulos || 0;
        map.set(z, cur);
      });
      return Array.from(map.values()).sort((a, b) => a.zona - b.zona);
    },
    enabled: !!municipio,
  });
}

// Bairros da cidade com drill-down
export function useBairrosCidade(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['bairrosCidade', municipio, ano],
    queryFn: async () => {
      let q = (supabase.from(TABELA_COMPARECIMENTO_SECAO) as any)
        .select('bairro, local_votacao, zona, secao, eleitorado_apto, comparecimento, abstencoes, votos_brancos, votos_nulos')
        .eq('municipio', municipio);
      if (ano) q = q.eq('ano', ano);
      const data = await fetchAll(q);
      
      const bairroMap = new Map<string, { bairro: string; apto: number; comp: number; abst: number; brancos: number; nulos: number; locais: Set<string>; zonas: Set<number>; secoes: number }>();
      data.forEach((r: any) => {
        const b = r.bairro || 'NÃO INFORMADO';
        const cur = bairroMap.get(b) || { bairro: b, apto: 0, comp: 0, abst: 0, brancos: 0, nulos: 0, locais: new Set(), zonas: new Set(), secoes: 0 };
        cur.apto += r.eleitorado_apto || 0;
        cur.comp += r.comparecimento || 0;
        cur.abst += r.abstencoes || 0;
        cur.brancos += r.votos_brancos || 0;
        cur.nulos += r.votos_nulos || 0;
        if (r.local_votacao) cur.locais.add(r.local_votacao);
        if (r.zona) cur.zonas.add(r.zona);
        cur.secoes++;
        bairroMap.set(b, cur);
      });
      
      return Array.from(bairroMap.values())
        .map(v => ({ ...v, locais: v.locais.size, zonas: Array.from(v.zonas) }))
        .sort((a, b) => b.apto - a.apto);
    },
    enabled: !!municipio,
  });
}

// Locais de votação com detalhes
export function useLocaisCidade(municipio: string, ano: number | null, bairro: string | null) {
  return useQuery({
    queryKey: ['locaisCidade', municipio, ano, bairro],
    queryFn: async () => {
      let q = (supabase.from(TABELA_COMPARECIMENTO_SECAO) as any)
        .select('local_votacao, bairro, zona, secao, eleitorado_apto, comparecimento, abstencoes, votos_brancos, votos_nulos')
        .eq('municipio', municipio);
      if (ano) q = q.eq('ano', ano);
      if (bairro) q = q.eq('bairro', bairro);
      const data = await fetchAll(q);
      
      const map = new Map<string, { local: string; bairro: string; zona: number; apto: number; comp: number; abst: number; brancos: number; nulos: number; secoes: number }>();
      data.forEach((r: any) => {
        const key = `${r.local_votacao}|${r.bairro}`;
        const cur = map.get(key) || { local: r.local_votacao || '', bairro: r.bairro || '', zona: r.zona || 0, apto: 0, comp: 0, abst: 0, brancos: 0, nulos: 0, secoes: 0 };
        cur.apto += r.eleitorado_apto || 0;
        cur.comp += r.comparecimento || 0;
        cur.abst += r.abstencoes || 0;
        cur.brancos += r.votos_brancos || 0;
        cur.nulos += r.votos_nulos || 0;
        cur.secoes++;
        map.set(key, cur);
      });
      return Array.from(map.values()).sort((a, b) => b.apto - a.apto);
    },
    enabled: !!municipio,
  });
}

// Votação de candidato por zona na cidade
export function useVotosCandidatoZona(municipio: string, ano: number | null, nomeCandidato: string | null) {
  return useQuery({
    queryKey: ['votosCandidatoZona', municipio, ano, nomeCandidato],
    queryFn: async () => {
      if (!nomeCandidato) return [];
      let q = (supabase.from(TABELA_VOTACAO) as any)
        .select('zona, total_votos, cargo, partido')
        .eq('municipio', municipio)
        .eq('nome_candidato', nomeCandidato);
      if (ano) q = q.eq('ano', ano);
      const { data } = await q;
      return (data || []).sort((a: any, b: any) => (b.total_votos || 0) - (a.total_votos || 0));
    },
    enabled: !!municipio && !!nomeCandidato,
  });
}

// Comparativo Goiânia vs Aparecida
export function useComparativoCidades(ano: number | null) {
  return useQuery({
    queryKey: ['comparativoCidades', ano],
    queryFn: async () => {
      const cidades = ['GOIÂNIA', 'APARECIDA DE GOIÂNIA'];
      const results: any[] = [];
      
      for (const cidade of cidades) {
        let cq = (supabase.from(TABELA_CANDIDATOS) as any)
          .select('id, genero, situacao_final, sigla_partido')
          .eq('municipio', cidade);
        if (ano) cq = cq.eq('ano', ano);
        const cands = await fetchAll(cq);
        
        let compQ = (supabase.from(TABELA_COMPARECIMENTO) as any)
          .select('eleitorado_apto, comparecimento, abstencoes')
          .eq('municipio', cidade);
        if (ano) compQ = compQ.eq('ano', ano);
        const comp = await fetchAll(compQ);
        
        const eleitos = cands.filter((c: any) => {
          const s = (c.situacao_final || '').toUpperCase();
          return (s.includes('ELEITO') || s.includes('MÉDIA') || s.includes('QP')) && !s.includes('NÃO ELEITO');
        }).length;
        
        results.push({
          cidade,
          candidatos: cands.length,
          eleitos,
          mulheres: cands.filter((c: any) => (c.genero || '').toUpperCase() === 'FEMININO').length,
          partidos: new Set(cands.map((c: any) => c.sigla_partido).filter(Boolean)).size,
          eleitorado: comp.reduce((s: number, r: any) => s + (r.eleitorado_apto || 0), 0),
          comparecimento: comp.reduce((s: number, r: any) => s + (r.comparecimento || 0), 0),
          abstencoes: comp.reduce((s: number, r: any) => s + (r.abstencoes || 0), 0),
        });
      }
      return results;
    },
  });
}

// Candidatos da cidade com patrimônio
export function useCandidatosCidadePatrimonio(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['candidatosCidadePatrimonio', municipio, ano],
    queryFn: async () => {
      let cq = (supabase.from(TABELA_CANDIDATOS) as any)
        .select('id, nome_urna, sigla_partido, cargo, situacao_final, genero, sequencial_candidato, foto_url, numero_urna')
        .eq('municipio', municipio);
      if (ano) cq = cq.eq('ano', ano);
      const cands = await fetchAll(cq);
      
      const seqs = cands.map((c: any) => c.sequencial_candidato).filter(Boolean);
      const patriMap = new Map<string, number>();
      if (seqs.length > 0) {
        for (let i = 0; i < seqs.length; i += 500) {
          const batch = seqs.slice(i, i + 500);
          const { data: bens } = await (supabase.from(TABELA_BENS) as any).select('sequencial_candidato, valor_bem').in('sequencial_candidato', batch);
          (bens || []).forEach((b: any) => patriMap.set(b.sequencial_candidato, (patriMap.get(b.sequencial_candidato) || 0) + (b.valor_bem || 0)));
        }
      }
      
      // Votos
      const names = cands.map((c: any) => c.nome_urna).filter(Boolean);
      const votosMap = new Map<string, number>();
      if (names.length > 0) {
        for (let i = 0; i < names.length; i += 100) {
          const batch = names.slice(i, i + 100);
          let vq = (supabase.from(TABELA_VOTACAO) as any).select('nome_candidato, total_votos').eq('municipio', municipio).in('nome_candidato', batch);
          if (ano) vq = vq.eq('ano', ano);
          const { data: votos } = await vq;
          (votos || []).forEach((v: any) => votosMap.set(v.nome_candidato, (votosMap.get(v.nome_candidato) || 0) + (v.total_votos || 0)));
        }
      }
      
      return cands.map((c: any) => ({
        ...c,
        patrimonio: patriMap.get(c.sequencial_candidato) || 0,
        votos: votosMap.get(c.nome_urna) || 0,
      })).sort((a: any, b: any) => b.votos - a.votos);
    },
    enabled: !!municipio,
  });
}

// Partidos na cidade
export function usePartidosCidade(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['partidosCidade', municipio, ano],
    queryFn: async () => {
      let cq = (supabase.from(TABELA_CANDIDATOS) as any)
        .select('sigla_partido, situacao_final, genero')
        .eq('municipio', municipio);
      if (ano) cq = cq.eq('ano', ano);
      const cands = await fetchAll(cq);
      
      let vq = (supabase.from(TABELA_VOTACAO) as any)
        .select('partido, total_votos')
        .eq('municipio', municipio);
      if (ano) vq = vq.eq('ano', ano);
      let votos: any[] = [];
      try { votos = await fetchAll(vq); } catch {}
      
      const map = new Map<string, { candidatos: number; votos: number; eleitos: number; mulheres: number }>();
      cands.forEach((c: any) => {
        const p = c.sigla_partido || 'OUTROS';
        const cur = map.get(p) || { candidatos: 0, votos: 0, eleitos: 0, mulheres: 0 };
        cur.candidatos++;
        const s = (c.situacao_final || '').toUpperCase();
        if (s.includes('ELEITO') && !s.includes('NÃO')) cur.eleitos++;
        if ((c.genero || '').toUpperCase() === 'FEMININO') cur.mulheres++;
        map.set(p, cur);
      });
      votos.forEach((v: any) => {
        const p = v.partido || 'OUTROS';
        const cur = map.get(p) || { candidatos: 0, votos: 0, eleitos: 0, mulheres: 0 };
        cur.votos += v.total_votos || 0;
        map.set(p, cur);
      });
      
      return Array.from(map.entries())
        .map(([partido, stats]) => ({ partido, ...stats }))
        .sort((a, b) => b.votos - a.votos || b.candidatos - a.candidatos);
    },
    enabled: !!municipio,
  });
}
