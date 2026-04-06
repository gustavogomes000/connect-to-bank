import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================
// ENTITY DICTIONARIES
// =============================================

const CARGOS_MAP: Record<string, string[]> = {
  "PREFEITO": ["prefeito", "prefeita", "prefeitura"],
  "VEREADOR": ["vereador", "vereadora", "vereadores", "câmara", "camara"],
  "GOVERNADOR": ["governador", "governadora", "governo do estado"],
  "DEPUTADO ESTADUAL": ["deputado estadual", "deputada estadual", "estaduais"],
  "DEPUTADO FEDERAL": ["deputado federal", "deputada federal", "federais"],
  "SENADOR": ["senador", "senadora"],
  "PRESIDENTE": ["presidente", "presidência", "presidencia"],
  "VICE-PREFEITO": ["vice-prefeito", "vice prefeito"],
};

const SITUACOES_MAP: Record<string, string[]> = {
  "ELEITO": ["eleito", "eleita", "eleitos", "eleitas", "ganhou", "ganharam", "venceu", "venceram", "vitorioso"],
  "NÃO ELEITO": ["não eleito", "nao eleito", "perdeu", "perderam", "derrotado"],
  "2º TURNO": ["segundo turno", "2o turno", "2º turno"],
  "SUPLENTE": ["suplente", "suplentes"],
};

const PARTIDOS_CONHECIDOS = [
  "PT", "PL", "MDB", "PSDB", "PP", "PSD", "UNIÃO", "REPUBLICANOS", "PDT", "PSB",
  "PODE", "PSOL", "AVANTE", "SOLIDARIEDADE", "CIDADANIA", "PCdoB", "PV", "REDE",
  "NOVO", "PROS", "DC", "PMB", "PMN", "PRTB", "PSC", "PTC", "PTB", "SD",
  "AGIR", "MOBILIZA", "PRD", "UNIÃO BRASIL",
];

const MUNICIPIOS_PRINCIPAIS = [
  "GOIÂNIA", "GOIANIA", "APARECIDA DE GOIÂNIA", "APARECIDA DE GOIANIA",
  "ANÁPOLIS", "ANAPOLIS", "RIO VERDE", "LUZIÂNIA", "LUZIANIA",
  "ÁGUAS LINDAS DE GOIÁS", "AGUAS LINDAS", "VALPARAÍSO DE GOIÁS", "VALPARAISO",
  "TRINDADE", "FORMOSA", "NOVO GAMA", "SENADOR CANEDO", "CATALÃO", "CATALAO",
  "ITUMBIARA", "JATAÍ", "JATAI", "PLANALTINA", "CALDAS NOVAS",
];

const GENEROS_MAP: Record<string, string[]> = {
  "FEMININO": ["mulher", "mulheres", "feminino", "feminina", "candidatas", "vereadoras", "prefeitas"],
  "MASCULINO": ["homem", "homens", "masculino", "candidatos homens"],
};

// =============================================
// INTENT DETECTION
// =============================================

type Intent =
  | "ranking_votos"
  | "ranking_patrimonio"
  | "total_candidatos"
  | "total_votos"
  | "comparecimento"
  | "abstencao"
  | "evolucao"
  | "comparativo_partidos"
  | "distribuicao_genero"
  | "distribuicao_instrucao"
  | "distribuicao_ocupacao"
  | "distribuicao_idade"
  | "bairro_comparecimento"
  | "busca_candidato"
  | "patrimonio_candidato"
  | "votos_por_zona"
  | "partidos_ranking"
  | "locais_votacao"
  | "resumo_eleicao"
  | "comparativo_anos"
  | "generico";

function detectIntent(tokens: string[], text: string): Intent {
  const has = (...words: string[]) => words.some(w => text.includes(w));

  if (has("patrimônio", "patrimonio", "bens", "declarado", "mais rico", "riqueza")) {
    if (has("ranking", "top", "maiores", "mais rico")) return "ranking_patrimonio";
    return "patrimonio_candidato";
  }
  if (has("comparecimento", "presença", "presenca", "frequência", "frequencia")) {
    if (has("bairro")) return "bairro_comparecimento";
    if (has("evolução", "evolucao", "ao longo", "histórico", "historico")) return "evolucao";
    return "comparecimento";
  }
  if (has("abstenção", "abstencao", "absteve", "faltou", "ausência", "ausencia")) return "abstencao";
  if (has("evolução", "evolucao", "ao longo", "tendência", "tendencia", "série", "serie", "histórico", "historico")) return "evolucao";
  if (has("gênero", "genero", "homens e mulheres", "sexo", "feminino", "masculino")) return "distribuicao_genero";
  if (has("escolaridade", "instrução", "instrucao", "grau de instrução", "formação", "formacao", "ensino")) return "distribuicao_instrucao";
  if (has("ocupação", "ocupacao", "profissão", "profissao", "trabalha")) return "distribuicao_ocupacao";
  if (has("idade", "faixa etária", "faixa etaria", "nascimento", "jovens", "idosos")) return "distribuicao_idade";
  if (has("local de votação", "local de votacao", "colégio", "colegio", "escola", "seção", "secao")) return "locais_votacao";
  if (has("zona") && has("voto", "votos")) return "votos_por_zona";
  if (has("comparar", "comparativo", "versus", "vs", " x ") && has("partido")) return "comparativo_partidos";
  if (has("comparar", "comparativo") && has("ano", "eleição", "eleicao")) return "comparativo_anos";
  if (has("resumo", "visão geral", "visao geral", "panorama", "overview")) return "resumo_eleicao";
  if (has("partido") && (has("ranking", "top", "maiores", "mais votos"))) return "partidos_ranking";
  if (has("ranking", "top", "mais votado", "mais votados", "campeão", "campeões")) return "ranking_votos";
  if (has("quantos", "quantas", "total de candidatos", "número de candidatos", "numero de candidatos")) return "total_candidatos";
  if (has("total de votos", "votos totais", "soma dos votos")) return "total_votos";
  if (has("bairro") && (has("votação", "votacao", "comparecimento"))) return "bairro_comparecimento";
  if (has("quem é", "quem e", "candidato", "perfil de", "informações sobre", "informacoes sobre", "dados de")) return "busca_candidato";
  if (has("partido") && (has("voto", "votos", "desempenho"))) return "partidos_ranking";
  return "generico";
}

// =============================================
// ENTITY EXTRACTION
// =============================================

interface Entities {
  anos: number[];
  municipios: string[];
  partidos: string[];
  cargos: string[];
  situacoes: string[];
  generos: string[];
  limite: number;
  nomes: string[];
  bairros: string[];
  zonas: number[];
  turnos: number[];
}

function extractEntities(text: string): Entities {
  const lower = text.toLowerCase();

  // Years
  const yearMatches = text.match(/\b(20\d{2})\b/g);
  const anos = yearMatches ? [...new Set(yearMatches.map(Number))].filter(y => y >= 2000 && y <= 2030) : [];

  // Turnos
  const turnos: number[] = [];
  if (lower.includes("primeiro turno") || lower.includes("1o turno") || lower.includes("1º turno")) turnos.push(1);
  if (lower.includes("segundo turno") || lower.includes("2o turno") || lower.includes("2º turno")) turnos.push(2);

  // Limit
  let limite = 20;
  const topMatch = text.match(/top\s*(\d+)/i) || text.match(/(\d+)\s*(mais|maiores|principais|primeiros)/i);
  if (topMatch) limite = Math.min(parseInt(topMatch[1]), 200);

  // Cargos
  const cargos: string[] = [];
  for (const [cargo, keywords] of Object.entries(CARGOS_MAP)) {
    if (keywords.some(k => lower.includes(k))) cargos.push(cargo);
  }

  // Situações
  const situacoes: string[] = [];
  for (const [sit, keywords] of Object.entries(SITUACOES_MAP)) {
    if (keywords.some(k => lower.includes(k))) situacoes.push(sit);
  }

  // Partidos
  const partidos: string[] = [];
  for (const p of PARTIDOS_CONHECIDOS) {
    const regex = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) partidos.push(p);
  }

  // Municípios
  const municipios: string[] = [];
  for (const m of MUNICIPIOS_PRINCIPAIS) {
    const normalized = m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const textNorm = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (textNorm.includes(normalized)) {
      municipios.push(m.includes("GOIANIA") ? "GOIÂNIA" :
        m.includes("APARECIDA") ? "APARECIDA DE GOIÂNIA" :
        m.includes("ANAPOLIS") ? "ANÁPOLIS" :
        m.includes("LUZIANIA") ? "LUZIÂNIA" :
        m.includes("CATALAO") ? "CATALÃO" :
        m.includes("JATAI") ? "JATAÍ" :
        m.includes("VALPARAISO") ? "VALPARAÍSO DE GOIÁS" :
        m.includes("AGUAS LINDAS") ? "ÁGUAS LINDAS DE GOIÁS" : m);
    }
  }

  // Gêneros
  const generos: string[] = [];
  for (const [g, keywords] of Object.entries(GENEROS_MAP)) {
    if (keywords.some(k => lower.includes(k))) generos.push(g);
  }

  // Zones
  const zonaMatch = text.match(/zona\s*(\d+)/gi);
  const zonas = zonaMatch ? zonaMatch.map(z => parseInt(z.replace(/\D/g, ''))) : [];

  // Names (quoted text or "candidato X")
  const nomes: string[] = [];
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) nomes.push(...quoted.map(q => q.replace(/"/g, '').toUpperCase()));

  return {
    anos: [...new Set(anos)],
    municipios: [...new Set(municipios)],
    partidos: [...new Set(partidos)],
    cargos: [...new Set(cargos)],
    situacoes: [...new Set(situacoes)],
    generos: [...new Set(generos)],
    limite,
    nomes,
    bairros: [],
    zonas: [...new Set(zonas)],
    turnos: [...new Set(turnos)],
  };
}

// =============================================
// SQL BUILDER
// =============================================

interface QueryPlan {
  sql: string;
  tipo_grafico: string;
  titulo: string;
  descricao: string;
}

function buildWhere(e: Entities, prefix: string = ""): string {
  const p = prefix ? `${prefix}.` : "";
  const clauses: string[] = [];
  if (e.anos.length === 1) clauses.push(`${p}ano = ${e.anos[0]}`);
  else if (e.anos.length > 1) clauses.push(`${p}ano IN (${e.anos.join(',')})`);
  if (e.municipios.length === 1) clauses.push(`UPPER(${p}municipio) = '${e.municipios[0].toUpperCase()}'`);
  else if (e.municipios.length > 1) clauses.push(`UPPER(${p}municipio) IN (${e.municipios.map(m => `'${m.toUpperCase()}'`).join(',')})`);
  if (e.partidos.length === 1) clauses.push(`UPPER(${p}sigla_partido) = '${e.partidos[0].toUpperCase()}'`);
  else if (e.partidos.length > 1) clauses.push(`UPPER(${p}sigla_partido) IN (${e.partidos.map(p2 => `'${p2.toUpperCase()}'`).join(',')})`);
  if (e.cargos.length === 1) clauses.push(`UPPER(${p}cargo) ILIKE '%${e.cargos[0]}%'`);
  else if (e.cargos.length > 1) clauses.push(`(${e.cargos.map(c => `UPPER(${p}cargo) ILIKE '%${c}%'`).join(' OR ')})`);
  if (e.turnos.length === 1) clauses.push(`${p}turno = ${e.turnos[0]}`);
  if (e.zonas.length === 1) clauses.push(`${p}zona = ${e.zonas[0]}`);
  else if (e.zonas.length > 1) clauses.push(`${p}zona IN (${e.zonas.join(',')})`);
  return clauses.length ? clauses.join(' AND ') : '';
}

function addSituacao(e: Entities, prefix: string = ""): string {
  const p = prefix ? `${prefix}.` : "";
  if (e.situacoes.length === 1) return ` AND UPPER(${p}situacao_final) ILIKE '%${e.situacoes[0]}%'`;
  return '';
}

function addGenero(e: Entities, prefix: string = ""): string {
  const p = prefix ? `${prefix}.` : "";
  if (e.generos.length === 1) return ` AND UPPER(${p}genero) = '${e.generos[0]}'`;
  return '';
}

function buildQuery(intent: Intent, e: Entities): QueryPlan {
  const anoLabel = e.anos.length === 1 ? e.anos[0].toString() : e.anos.length > 1 ? e.anos.join('/') : 'todas as eleições';
  const munLabel = e.municipios.length === 1 ? e.municipios[0] : e.municipios.length > 1 ? e.municipios.join(', ') : 'Goiás';
  const cargoLabel = e.cargos.length === 1 ? e.cargos[0].toLowerCase() : 'todos os cargos';
  const where = buildWhere(e);
  const whereClause = where ? `WHERE ${where}` : '';

  switch (intent) {

    case "ranking_votos": {
      const vWhere = buildWhere(e, "v");
      const cWhere = buildWhere(e, "c");
      return {
        sql: `SELECT v.nome_candidato AS candidato, v.partido, SUM(v.total_votos) AS total_votos,
          COALESCE(c.situacao_final, '-') AS situacao
          FROM bd_eleicoes_votacao v
          LEFT JOIN bd_eleicoes_candidatos c ON v.numero_urna = c.numero_urna AND v.ano = c.ano 
            AND UPPER(v.municipio) = UPPER(c.municipio) AND UPPER(v.cargo) = UPPER(c.cargo)
          ${vWhere ? `WHERE ${vWhere}` : ''}${e.situacoes.length ? addSituacao(e, 'c') : ''}${e.generos.length ? addGenero(e, 'c') : ''}
          GROUP BY v.nome_candidato, v.partido, c.situacao_final
          ORDER BY total_votos DESC LIMIT ${e.limite}`,
        tipo_grafico: "bar",
        titulo: `Top ${e.limite} candidatos mais votados — ${munLabel} ${anoLabel}`,
        descricao: `Ranking de candidatos ${cargoLabel !== 'todos os cargos' ? 'para ' + cargoLabel : ''} ordenados por total de votos`,
      };
    }

    case "ranking_patrimonio": {
      const bWhere = buildWhere(e);
      return {
        sql: `SELECT nome_candidato AS candidato, sigla_partido AS partido,
          SUM(valor_bem) AS patrimonio_total, COUNT(*) AS qtd_bens
          FROM bd_eleicoes_bens_candidatos
          ${bWhere ? `WHERE ${bWhere}` : ''}
          GROUP BY nome_candidato, sigla_partido
          ORDER BY patrimonio_total DESC LIMIT ${e.limite}`,
        tipo_grafico: "bar",
        titulo: `Top ${e.limite} candidatos com maior patrimônio — ${anoLabel}`,
        descricao: `Patrimônio total declarado dos candidatos ${munLabel}`,
      };
    }

    case "patrimonio_candidato": {
      if (e.nomes.length > 0) {
        return {
          sql: `SELECT tipo_bem, descricao_bem AS descricao, valor_bem AS valor
            FROM bd_eleicoes_bens_candidatos
            WHERE UPPER(nome_candidato) ILIKE '%${e.nomes[0]}%'
            ${e.anos.length === 1 ? `AND ano = ${e.anos[0]}` : ''}
            ORDER BY valor_bem DESC LIMIT 50`,
          tipo_grafico: "table",
          titulo: `Bens declarados — ${e.nomes[0]}`,
          descricao: `Lista detalhada dos bens declarados pelo candidato`,
        };
      }
      return buildQuery("ranking_patrimonio", e);
    }

    case "total_candidatos": {
      return {
        sql: `SELECT ano, cargo, COUNT(*) AS total_candidatos,
          COUNT(CASE WHEN genero = 'FEMININO' THEN 1 END) AS mulheres,
          COUNT(CASE WHEN genero = 'MASCULINO' THEN 1 END) AS homens
          FROM bd_eleicoes_candidatos
          ${whereClause}${addGenero(e)}${addSituacao(e)}
          GROUP BY ano, cargo ORDER BY ano DESC, total_candidatos DESC LIMIT 100`,
        tipo_grafico: "table",
        titulo: `Total de candidatos — ${munLabel} ${anoLabel}`,
        descricao: `Contagem de candidatos por ano e cargo`,
      };
    }

    case "total_votos": {
      return {
        sql: `SELECT ano, cargo, SUM(total_votos) AS votos_totais,
          COUNT(DISTINCT nome_candidato) AS candidatos
          FROM bd_eleicoes_votacao
          ${whereClause}
          GROUP BY ano, cargo ORDER BY ano DESC, votos_totais DESC LIMIT 50`,
        tipo_grafico: "table",
        titulo: `Total de votos — ${munLabel} ${anoLabel}`,
        descricao: `Soma total de votos por ano e cargo`,
      };
    }

    case "comparecimento": {
      return {
        sql: `SELECT ano, municipio, turno,
          SUM(eleitorado_apto) AS eleitores_aptos,
          SUM(comparecimento) AS comparecimento,
          SUM(abstencoes) AS abstencoes,
          ROUND(SUM(comparecimento)::numeric * 100.0 / NULLIF(SUM(eleitorado_apto), 0), 1) AS taxa_comparecimento
          FROM bd_eleicoes_comparecimento
          ${whereClause}
          GROUP BY ano, municipio, turno ORDER BY ano DESC, municipio LIMIT 100`,
        tipo_grafico: e.anos.length > 1 || e.anos.length === 0 ? "line" : "bar",
        titulo: `Comparecimento eleitoral — ${munLabel} ${anoLabel}`,
        descricao: `Dados de comparecimento, abstenção e taxa de participação`,
      };
    }

    case "abstencao": {
      return {
        sql: `SELECT ano, municipio,
          SUM(abstencoes) AS total_abstencoes,
          SUM(eleitorado_apto) AS eleitores_aptos,
          ROUND(SUM(abstencoes)::numeric * 100.0 / NULLIF(SUM(eleitorado_apto), 0), 1) AS taxa_abstencao
          FROM bd_eleicoes_comparecimento
          ${whereClause}
          GROUP BY ano, municipio ORDER BY taxa_abstencao DESC LIMIT 50`,
        tipo_grafico: "bar",
        titulo: `Abstenção eleitoral — ${munLabel} ${anoLabel}`,
        descricao: `Taxa de abstenção por município/ano`,
      };
    }

    case "evolucao": {
      // If talking about comparecimento
      return {
        sql: `SELECT ano,
          SUM(eleitorado_apto) AS eleitores_aptos,
          SUM(comparecimento) AS comparecimento,
          SUM(abstencoes) AS abstencoes,
          ROUND(SUM(comparecimento)::numeric * 100.0 / NULLIF(SUM(eleitorado_apto), 0), 1) AS taxa_comparecimento
          FROM bd_eleicoes_comparecimento
          ${where ? `WHERE ${where} AND turno = 1` : 'WHERE turno = 1'}
          GROUP BY ano ORDER BY ano LIMIT 20`,
        tipo_grafico: "line",
        titulo: `Evolução eleitoral — ${munLabel}`,
        descricao: `Série histórica de comparecimento e abstenção`,
      };
    }

    case "comparativo_partidos": {
      if (e.partidos.length >= 2) {
        const pList = e.partidos.map(p => `'${p}'`).join(',');
        return {
          sql: `SELECT sigla_partido AS partido, SUM(total_votos) AS votos_totais,
            SUM(votos_nominais) AS votos_nominais, SUM(votos_legenda) AS votos_legenda
            FROM bd_eleicoes_votacao_partido
            WHERE UPPER(sigla_partido) IN (${pList})
            ${e.anos.length === 1 ? ` AND ano = ${e.anos[0]}` : ''}
            ${e.cargos.length ? ` AND UPPER(cargo) ILIKE '%${e.cargos[0]}%'` : ''}
            ${e.municipios.length === 1 ? ` AND UPPER(municipio) = '${e.municipios[0]}'` : ''}
            GROUP BY sigla_partido ORDER BY votos_totais DESC`,
          tipo_grafico: "bar",
          titulo: `Comparativo ${e.partidos.join(' × ')} — ${anoLabel}`,
          descricao: `Votos totais, nominais e de legenda entre partidos`,
        };
      }
      return buildQuery("partidos_ranking", e);
    }

    case "partidos_ranking": {
      return {
        sql: `SELECT sigla_partido AS partido, SUM(total_votos) AS votos_totais,
          SUM(votos_nominais) AS votos_nominais, SUM(votos_legenda) AS votos_legenda
          FROM bd_eleicoes_votacao_partido
          ${whereClause}
          GROUP BY sigla_partido ORDER BY votos_totais DESC LIMIT ${e.limite}`,
        tipo_grafico: "bar",
        titulo: `Ranking de partidos — ${munLabel} ${anoLabel}`,
        descricao: `Partidos ordenados por total de votos`,
      };
    }

    case "distribuicao_genero": {
      return {
        sql: `SELECT genero, COUNT(*) AS total,
          ROUND(COUNT(*)::numeric * 100.0 / SUM(COUNT(*)) OVER(), 1) AS percentual
          FROM bd_eleicoes_candidatos
          ${whereClause}${addSituacao(e)}
          GROUP BY genero ORDER BY total DESC`,
        tipo_grafico: "pie",
        titulo: `Distribuição por gênero — ${cargoLabel} ${munLabel} ${anoLabel}`,
        descricao: `Proporção de candidatos por gênero`,
      };
    }

    case "distribuicao_instrucao": {
      return {
        sql: `SELECT grau_instrucao AS escolaridade, COUNT(*) AS total,
          ROUND(COUNT(*)::numeric * 100.0 / SUM(COUNT(*)) OVER(), 1) AS percentual
          FROM bd_eleicoes_candidatos
          ${whereClause}${addGenero(e)}${addSituacao(e)}
          GROUP BY grau_instrucao ORDER BY total DESC`,
        tipo_grafico: "bar",
        titulo: `Escolaridade dos candidatos — ${munLabel} ${anoLabel}`,
        descricao: `Distribuição por grau de instrução`,
      };
    }

    case "distribuicao_ocupacao": {
      return {
        sql: `SELECT ocupacao, COUNT(*) AS total
          FROM bd_eleicoes_candidatos
          ${whereClause}${addGenero(e)}${addSituacao(e)}
          GROUP BY ocupacao ORDER BY total DESC LIMIT ${e.limite}`,
        tipo_grafico: "bar",
        titulo: `Ocupações dos candidatos — ${munLabel} ${anoLabel}`,
        descricao: `Profissões mais comuns entre candidatos`,
      };
    }

    case "distribuicao_idade": {
      return {
        sql: `SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(data_nascimento, 'YYYY-MM-DD'))) < 30 THEN '18-29'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(data_nascimento, 'YYYY-MM-DD'))) < 40 THEN '30-39'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(data_nascimento, 'YYYY-MM-DD'))) < 50 THEN '40-49'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(data_nascimento, 'YYYY-MM-DD'))) < 60 THEN '50-59'
            ELSE '60+'
          END AS faixa_etaria,
          COUNT(*) AS total
          FROM bd_eleicoes_candidatos
          WHERE data_nascimento IS NOT NULL AND data_nascimento != ''
          ${where ? `AND ${where}` : ''}${addGenero(e)}${addSituacao(e)}
          GROUP BY faixa_etaria ORDER BY faixa_etaria`,
        tipo_grafico: "bar",
        titulo: `Faixa etária dos candidatos — ${munLabel} ${anoLabel}`,
        descricao: `Distribuição por idade dos candidatos`,
      };
    }

    case "bairro_comparecimento": {
      return {
        sql: `SELECT bairro, local_votacao,
          SUM(eleitorado_apto) AS eleitores_aptos,
          SUM(comparecimento) AS comparecimento,
          SUM(abstencoes) AS abstencoes,
          ROUND(SUM(comparecimento)::numeric * 100.0 / NULLIF(SUM(eleitorado_apto), 0), 1) AS taxa_comparecimento
          FROM bd_eleicoes_comparecimento_secao
          WHERE bairro IS NOT NULL
          ${e.anos.length === 1 ? ` AND ano = ${e.anos[0]}` : ''}
          ${e.municipios.length === 1 ? ` AND UPPER(municipio) = '${e.municipios[0]}'` : ''}
          GROUP BY bairro, local_votacao ORDER BY eleitores_aptos DESC LIMIT ${e.limite}`,
        tipo_grafico: "table",
        titulo: `Comparecimento por bairro — ${munLabel} ${anoLabel}`,
        descricao: `Dados de comparecimento detalhados por local de votação`,
      };
    }

    case "busca_candidato": {
      if (e.nomes.length > 0) {
        return {
          sql: `SELECT nome_completo, nome_urna, sigla_partido AS partido, cargo, municipio,
            numero_urna, situacao_candidatura, situacao_final, genero, grau_instrucao, ocupacao, ano
            FROM bd_eleicoes_candidatos
            WHERE UPPER(nome_completo) ILIKE '%${e.nomes[0]}%' OR UPPER(nome_urna) ILIKE '%${e.nomes[0]}%'
            ${e.anos.length === 1 ? ` AND ano = ${e.anos[0]}` : ''}
            ORDER BY ano DESC LIMIT 20`,
          tipo_grafico: "table",
          titulo: `Resultados para "${e.nomes[0]}"`,
          descricao: `Dados encontrados para o candidato pesquisado`,
        };
      }
      // Fallback to generic search
      return {
        sql: `SELECT nome_urna, sigla_partido AS partido, cargo, municipio, situacao_final, ano
          FROM bd_eleicoes_candidatos
          ${whereClause}${addGenero(e)}${addSituacao(e)}
          ORDER BY ano DESC LIMIT ${e.limite}`,
        tipo_grafico: "table",
        titulo: `Candidatos — ${munLabel} ${anoLabel}`,
        descricao: `Lista de candidatos com filtros aplicados`,
      };
    }

    case "votos_por_zona": {
      return {
        sql: `SELECT zona, SUM(total_votos) AS votos_totais,
          COUNT(DISTINCT nome_candidato) AS candidatos
          FROM bd_eleicoes_votacao
          ${whereClause}
          GROUP BY zona ORDER BY votos_totais DESC LIMIT 50`,
        tipo_grafico: "bar",
        titulo: `Votos por zona eleitoral — ${munLabel} ${anoLabel}`,
        descricao: `Distribuição de votos por zona`,
      };
    }

    case "locais_votacao": {
      return {
        sql: `SELECT local_votacao, bairro, endereco_local AS endereco,
          SUM(eleitorado_apto) AS eleitores, COUNT(DISTINCT secao) AS secoes
          FROM bd_eleicoes_locais_votacao
          ${whereClause}
          GROUP BY local_votacao, bairro, endereco_local
          ORDER BY eleitores DESC LIMIT ${e.limite}`,
        tipo_grafico: "table",
        titulo: `Locais de votação — ${munLabel} ${anoLabel}`,
        descricao: `Colégios eleitorais e quantidade de eleitores`,
      };
    }

    case "resumo_eleicao": {
      return {
        sql: `SELECT
          (SELECT COUNT(*) FROM bd_eleicoes_candidatos ${whereClause}) AS total_candidatos,
          (SELECT COUNT(DISTINCT sigla_partido) FROM bd_eleicoes_candidatos ${whereClause}) AS total_partidos,
          (SELECT COUNT(DISTINCT municipio) FROM bd_eleicoes_candidatos ${whereClause}) AS total_municipios,
          (SELECT SUM(total_votos) FROM bd_eleicoes_votacao ${whereClause}) AS total_votos,
          (SELECT SUM(eleitorado_apto) FROM bd_eleicoes_comparecimento ${whereClause ? whereClause + ' AND turno = 1' : 'WHERE turno = 1'}) AS eleitorado_apto,
          (SELECT SUM(comparecimento) FROM bd_eleicoes_comparecimento ${whereClause ? whereClause + ' AND turno = 1' : 'WHERE turno = 1'}) AS comparecimento`,
        tipo_grafico: "kpi",
        titulo: `Resumo da eleição — ${munLabel} ${anoLabel}`,
        descricao: `Visão geral com indicadores-chave`,
      };
    }

    case "comparativo_anos": {
      return {
        sql: `SELECT ano, COUNT(*) AS candidatos,
          COUNT(DISTINCT sigla_partido) AS partidos,
          COUNT(CASE WHEN genero = 'FEMININO' THEN 1 END) AS mulheres
          FROM bd_eleicoes_candidatos
          ${e.municipios.length === 1 ? `WHERE UPPER(municipio) = '${e.municipios[0]}'` : ''}
          ${e.cargos.length === 1 ? `${e.municipios.length ? ' AND' : 'WHERE'} UPPER(cargo) ILIKE '%${e.cargos[0]}%'` : ''}
          GROUP BY ano ORDER BY ano`,
        tipo_grafico: "line",
        titulo: `Comparativo entre eleições — ${munLabel}`,
        descricao: `Evolução de candidatos, partidos e representação feminina`,
      };
    }

    default: {
      // Generic: try to build something useful based on entities
      if (e.partidos.length > 0) return buildQuery("partidos_ranking", e);
      if (e.nomes.length > 0) return buildQuery("busca_candidato", e);
      return {
        sql: `SELECT nome_urna AS candidato, sigla_partido AS partido, cargo, municipio,
          situacao_final, ano
          FROM bd_eleicoes_candidatos
          ${whereClause}${addGenero(e)}${addSituacao(e)}
          ORDER BY ano DESC, nome_urna LIMIT ${e.limite}`,
        tipo_grafico: "table",
        titulo: `Resultados — ${munLabel} ${anoLabel}`,
        descricao: `Dados encontrados com base na sua consulta`,
      };
    }
  }
}

// =============================================
// RESPONSE BUILDER
// =============================================

function buildTextResponse(intent: Intent, e: Entities, dados: any[], titulo: string): string {
  if (!dados || dados.length === 0) {
    return `Não encontrei dados para sua consulta. Tente especificar um ano (ex: 2024), município (ex: Goiânia) ou cargo (ex: vereador).`;
  }

  const count = dados.length;
  let msg = `Encontrei **${count} resultado${count > 1 ? 's' : ''}** para sua consulta.\n\n`;

  switch (intent) {
    case "ranking_votos":
      msg += `🏆 **${dados[0]?.candidato || ''}** lidera com **${Number(dados[0]?.total_votos || 0).toLocaleString('pt-BR')}** votos`;
      if (dados[1]) msg += `, seguido por **${dados[1]?.candidato}** com ${Number(dados[1]?.total_votos || 0).toLocaleString('pt-BR')} votos`;
      msg += '.';
      break;
    case "ranking_patrimonio":
      msg += `💰 **${dados[0]?.candidato || ''}** possui o maior patrimônio declarado: **R$ ${Number(dados[0]?.patrimonio_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}**`;
      break;
    case "comparecimento":
      if (dados[0]?.taxa_comparecimento) msg += `📊 Taxa de comparecimento: **${dados[0].taxa_comparecimento}%**`;
      break;
    case "distribuicao_genero":
      msg += dados.map(d => `• ${d.genero}: **${d.total}** (${d.percentual}%)`).join('\n');
      break;
    case "resumo_eleicao":
      if (dados[0]) {
        const d = dados[0];
        msg += `📋 **${Number(d.total_candidatos || 0).toLocaleString('pt-BR')}** candidatos de **${d.total_partidos}** partidos em **${d.total_municipios}** municípios`;
      }
      break;
    default:
      msg += `Os dados estão exibidos na visualização abaixo.`;
  }

  return msg;
}

// =============================================
// MAIN HANDLER
// =============================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pergunta } = await req.json();
    if (!pergunta || typeof pergunta !== "string" || pergunta.trim().length < 3) {
      return new Response(JSON.stringify({ erro: "Pergunta muito curta. Tente algo como: 'Top 10 vereadores mais votados em Goiânia 2024'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = pergunta.trim();
    const textLower = text.toLowerCase();
    const tokens = textLower.split(/\s+/);

    // Extract entities and detect intent
    const entities = extractEntities(text);
    const intent = detectIntent(tokens, textLower);

    // Build query
    const plan = buildQuery(intent, entities);

    // Safety check
    const sqlUpper = plan.sql.toUpperCase().trim();
    if (!sqlUpper.startsWith("SELECT") || /\b(DROP|DELETE|INSERT|UPDATE|ALTER|TRUNCATE|CREATE)\b/.test(sqlUpper)) {
      return new Response(JSON.stringify({ erro: "Query bloqueada por segurança" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute SQL
    const supabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const dbClient = createClient(supabaseUrl, supabaseKey);

    // Try using rpc execute_readonly_query
    const { data: queryResult, error: queryError } = await dbClient.rpc('execute_readonly_query' as any, {
      query_text: plan.sql
    }) as any;

    if (queryError) {
      console.error("Query error:", queryError.message, "SQL:", plan.sql);
      return new Response(JSON.stringify({
        sucesso: false,
        erro: `Erro ao executar consulta: ${queryError.message}`,
        sql_gerado: plan.sql,
        intent,
        entities_encontradas: {
          anos: entities.anos, municipios: entities.municipios, partidos: entities.partidos,
          cargos: entities.cargos, limite: entities.limite,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dados = Array.isArray(queryResult) ? queryResult : [];
    const colunas = dados.length > 0 ? Object.keys(dados[0]) : [];

    // Build text response
    const resposta_texto = buildTextResponse(intent, entities, dados, plan.titulo);

    return new Response(JSON.stringify({
      sucesso: true,
      tipo_grafico: plan.tipo_grafico,
      titulo: plan.titulo,
      descricao: plan.descricao,
      resposta_texto,
      colunas,
      dados,
      sql_gerado: plan.sql,
      intent,
      entities_encontradas: {
        anos: entities.anos, municipios: entities.municipios, partidos: entities.partidos,
        cargos: entities.cargos, situacoes: entities.situacoes, generos: entities.generos,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("Chat Error:", e);
    return new Response(JSON.stringify({ erro: e.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
