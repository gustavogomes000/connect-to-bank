import { useQuery } from '@tanstack/react-query';
import { mdQuery, MD, COL } from '@/lib/motherduck';

// KPIs por cidade
export function useCidadeKPIs(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['cidadeKPIs', municipio, ano],
    queryFn: async () => {
      const anoFilter = ano ? `AND ${COL.ano} = ${ano}` : '';
      const [cands] = await mdQuery<any>(
        `SELECT count(*) as total,
          count(CASE WHEN ${COL.situacaoFinal} ILIKE '%ELEITO%' AND ${COL.situacaoFinal} NOT ILIKE '%NÃO ELEITO%' THEN 1 END) as eleitos,
          count(CASE WHEN ${COL.genero} = 'FEMININO' THEN 1 END) as mulheres,
          count(DISTINCT ${COL.partido}) as partidos,
          count(DISTINCT ${COL.cargo}) as cargos
        FROM ${MD.candidatos} WHERE ${COL.municipio} = '${municipio}' ${anoFilter}`
      );
      const anoVal = ano || 2024;
      let comp = { apto: 0, comp: 0, abst: 0, brancos: 0, nulos: 0 };
      try {
        const [r] = await mdQuery<any>(
          `SELECT sum(qt_aptos) as apto, sum(qt_comparecimento) as comp, sum(qt_abstencoes) as abst,
            sum(qt_votos_brancos) as brancos, sum(qt_votos_nulos) as nulos
          FROM ${MD.comparecimento(anoVal)} WHERE nm_municipio = '${municipio}'`
        );
        comp = { apto: Number(r?.apto||0), comp: Number(r?.comp||0), abst: Number(r?.abst||0), brancos: Number(r?.brancos||0), nulos: Number(r?.nulos||0) };
      } catch {}
      return {
        totalCandidatos: Number(cands?.total||0), eleitos: Number(cands?.eleitos||0),
        mulheres: Number(cands?.mulheres||0), partidos: Number(cands?.partidos||0),
        cargos: Number(cands?.cargos||0), totalApto: comp.apto, totalComp: comp.comp,
        totalAbst: comp.abst, totalBrancos: comp.brancos, totalNulos: comp.nulos,
      };
    },
    enabled: !!municipio,
  });
}

export function useTopVotadosCidade(municipio: string, ano: number | null, cargo: string | null) {
  return useQuery({
    queryKey: ['topVotadosCidade', municipio, ano, cargo],
    queryFn: async () => {
      const anoVal = ano || 2024;
      const cargoFilter = cargo ? `AND ds_cargo ILIKE '%${cargo}%'` : '';
      try {
        return await mdQuery(
          `SELECT nm_urna_candidato as nome, sg_partido as partido, ds_cargo as cargo,
            nr_candidato as numero, sum(qt_votos_nominais) as votos, count(DISTINCT nr_zona) as zonas
          FROM ${MD.votacao(anoVal)} WHERE nm_municipio = '${municipio}' ${cargoFilter}
          GROUP BY nm_urna_candidato, sg_partido, ds_cargo, nr_candidato
          ORDER BY votos DESC`
        ).then(rows => rows.map((r: any) => ({ ...r, votos: Number(r.votos), zonas: Number(r.zonas) })));
      } catch { return []; }
    },
    enabled: !!municipio,
  });
}

export function useVotacaoZonaCidade(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['votacaoZonaCidade', municipio, ano],
    queryFn: async () => {
      const anoVal = ano || 2024;
      try {
        return await mdQuery(
          `SELECT nr_zona as zona, sum(qt_aptos) as apto, sum(qt_comparecimento) as comp,
            sum(qt_abstencoes) as abst, sum(qt_votos_brancos) as brancos, sum(qt_votos_nulos) as nulos
          FROM ${MD.comparecimento(anoVal)} WHERE nm_municipio = '${municipio}'
          GROUP BY nr_zona ORDER BY zona`
        ).then(rows => rows.map((r: any) => ({ zona: Number(r.zona), apto: Number(r.apto), comp: Number(r.comp), abst: Number(r.abst), brancos: Number(r.brancos), nulos: Number(r.nulos) })));
      } catch { return []; }
    },
    enabled: !!municipio,
  });
}

export function useBairrosCidade(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['bairrosCidade', municipio, ano],
    queryFn: async () => {
      const anoVal = ano || 2024;
      try {
        return await mdQuery(
          `SELECT nm_bairro as bairro, sum(qt_aptos) as apto, sum(qt_comparecimento) as comp,
            sum(qt_abstencoes) as abst, sum(qt_votos_brancos) as brancos, sum(qt_votos_nulos) as nulos,
            count(DISTINCT nm_local_votacao) as locais, count(DISTINCT nr_zona) as zonas_count, count(*) as secoes
          FROM ${MD.comparecimentoSecao(anoVal)} WHERE nm_municipio = '${municipio}'
          GROUP BY nm_bairro ORDER BY apto DESC`
        ).then(rows => rows.map((r: any) => ({
          bairro: r.bairro || 'NÃO INFORMADO', apto: Number(r.apto), comp: Number(r.comp),
          abst: Number(r.abst), brancos: Number(r.brancos), nulos: Number(r.nulos),
          locais: Number(r.locais), zonas: [], secoes: Number(r.secoes),
        })));
      } catch { return []; }
    },
    enabled: !!municipio,
  });
}

export function useLocaisCidade(municipio: string, ano: number | null, bairro: string | null) {
  return useQuery({
    queryKey: ['locaisCidade', municipio, ano, bairro],
    queryFn: async () => {
      const anoVal = ano || 2024;
      const bairroFilter = bairro ? `AND nm_bairro = '${bairro}'` : '';
      try {
        return await mdQuery(
          `SELECT nm_local_votacao as local, nm_bairro as bairro, min(nr_zona) as zona,
            sum(qt_aptos) as apto, sum(qt_comparecimento) as comp, sum(qt_abstencoes) as abst,
            sum(qt_votos_brancos) as brancos, sum(qt_votos_nulos) as nulos, count(*) as secoes
          FROM ${MD.comparecimentoSecao(anoVal)} WHERE nm_municipio = '${municipio}' ${bairroFilter}
          GROUP BY nm_local_votacao, nm_bairro ORDER BY apto DESC`
        ).then(rows => rows.map((r: any) => ({
          local: r.local, bairro: r.bairro, zona: Number(r.zona), apto: Number(r.apto),
          comp: Number(r.comp), abst: Number(r.abst), brancos: Number(r.brancos),
          nulos: Number(r.nulos), secoes: Number(r.secoes),
        })));
      } catch { return []; }
    },
    enabled: !!municipio,
  });
}

export function useVotosCandidatoZona(municipio: string, ano: number | null, nomeCandidato: string | null) {
  return useQuery({
    queryKey: ['votosCandidatoZona', municipio, ano, nomeCandidato],
    queryFn: async () => {
      if (!nomeCandidato) return [];
      const anoVal = ano || 2024;
      try {
        return await mdQuery(
          `SELECT nr_zona as zona, qt_votos_nominais as total_votos, ds_cargo as cargo, sg_partido as partido
          FROM ${MD.votacao(anoVal)} WHERE nm_municipio = '${municipio}' AND nm_urna_candidato = '${nomeCandidato}'
          ORDER BY total_votos DESC`
        ).then(rows => rows.map((r: any) => ({ ...r, total_votos: Number(r.total_votos) })));
      } catch { return []; }
    },
    enabled: !!municipio && !!nomeCandidato,
  });
}

export function useComparativoCidades(ano: number | null) {
  return useQuery({
    queryKey: ['comparativoCidades', ano],
    queryFn: async () => {
      const anoVal = ano || 2024;
      const cidades = ['GOIÂNIA', 'APARECIDA DE GOIÂNIA'];
      const results = await Promise.all(cidades.map(async cidade => {
        const anoFilter = `AND ${COL.ano} = ${anoVal}`;
        const [cands] = await mdQuery<any>(
          `SELECT count(*) as total,
            count(CASE WHEN ${COL.situacaoFinal} ILIKE '%ELEITO%' AND ${COL.situacaoFinal} NOT ILIKE '%NÃO ELEITO%' THEN 1 END) as eleitos,
            count(CASE WHEN ${COL.genero} = 'FEMININO' THEN 1 END) as mulheres,
            count(DISTINCT ${COL.partido}) as partidos
          FROM ${MD.candidatos} WHERE ${COL.municipio} = '${cidade}' ${anoFilter}`
        );
        let comp = { eleitorado: 0, comparecimento: 0, abstencoes: 0 };
        try {
          const [r] = await mdQuery<any>(
            `SELECT sum(qt_aptos) as apto, sum(qt_comparecimento) as comp, sum(qt_abstencoes) as abst
            FROM ${MD.comparecimento(anoVal)} WHERE nm_municipio = '${cidade}'`
          );
          comp = { eleitorado: Number(r?.apto||0), comparecimento: Number(r?.comp||0), abstencoes: Number(r?.abst||0) };
        } catch {}
        return {
          cidade, candidatos: Number(cands?.total||0), eleitos: Number(cands?.eleitos||0),
          mulheres: Number(cands?.mulheres||0), partidos: Number(cands?.partidos||0), ...comp,
        };
      }));
      return results;
    },
  });
}

export function useCandidatosCidadePatrimonio(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['candidatosCidadePatrimonio', municipio, ano],
    queryFn: async () => {
      const anoVal = ano || 2024;
      return mdQuery(
        `SELECT c.${COL.sequencial} as id, c.${COL.nomeUrna} as nome_urna, c.${COL.partido} as sigla_partido,
          c.${COL.cargo} as cargo, c.${COL.situacaoFinal} as situacao_final, c.${COL.genero} as genero,
          c.${COL.numero} as numero_urna, COALESCE(sum(b.${COL.valorBem}), 0) as patrimonio
        FROM ${MD.candidatos} c
        LEFT JOIN ${MD.bens} b ON c.${COL.sequencial} = b.${COL.sequencial} AND c.${COL.ano} = b.${COL.ano}
        WHERE c.${COL.municipio} = '${municipio}' AND c.${COL.ano} = ${anoVal}
        GROUP BY c.${COL.sequencial}, c.${COL.nomeUrna}, c.${COL.partido}, c.${COL.cargo},
          c.${COL.situacaoFinal}, c.${COL.genero}, c.${COL.numero}
        ORDER BY patrimonio DESC LIMIT 200`
      ).then(rows => rows.map((r: any) => ({ ...r, patrimonio: Number(r.patrimonio), votos: 0 })));
    },
    enabled: !!municipio,
  });
}

export function usePartidosCidade(municipio: string, ano: number | null) {
  return useQuery({
    queryKey: ['partidosCidade', municipio, ano],
    queryFn: async () => {
      const anoVal = ano || 2024;
      const anoFilter = `AND ${COL.ano} = ${anoVal}`;
      return mdQuery(
        `SELECT ${COL.partido} as partido, count(*) as candidatos,
          count(CASE WHEN ${COL.situacaoFinal} ILIKE '%ELEITO%' AND ${COL.situacaoFinal} NOT ILIKE '%NÃO ELEITO%' THEN 1 END) as eleitos,
          count(CASE WHEN ${COL.genero} = 'FEMININO' THEN 1 END) as mulheres
        FROM ${MD.candidatos} WHERE ${COL.municipio} = '${municipio}' ${anoFilter}
        GROUP BY ${COL.partido} ORDER BY candidatos DESC`
      ).then(rows => rows.map((r: any) => ({
        partido: r.partido, candidatos: Number(r.candidatos), votos: 0,
        eleitos: Number(r.eleitos), mulheres: Number(r.mulheres),
      })));
    },
    enabled: !!municipio,
  });
}
