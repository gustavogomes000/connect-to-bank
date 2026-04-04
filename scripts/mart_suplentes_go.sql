-- ═══════════════════════════════════════════════════════════
--  MART: SUPLENTES DE GOIÁS
--  Cruza candidatos suplentes + votação + bens declarados
--  Dataset: eleicoes_go_clean
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE TABLE `silver-idea-389314.eleicoes_go_clean.mart_suplentes_go` AS

WITH suplentes AS (
  -- Candidatos que ficaram como SUPLENTE em qualquer eleição GO
  SELECT
    sq_candidato,
    nm_candidato,
    nm_urna_candidato,
    sg_partido,
    nr_candidato,
    ds_cargo,
    ano_eleicao,
    sg_uf,
    nm_municipio_nascimento,
    ds_grau_instrucao,
    ds_genero,
    ds_ocupacao,
    dt_nascimento,
    nm_email,
    ds_sit_tot_turno
  FROM (
    -- Tenta diferentes nomes de coluna que o TSE usa ao longo dos anos
    SELECT
      COALESCE(sq_candidato, sequencial_candidato) AS sq_candidato,
      COALESCE(nm_candidato, nome_candidato) AS nm_candidato,
      COALESCE(nm_urna_candidato, nome_urna) AS nm_urna_candidato,
      COALESCE(sg_partido, sigla_partido) AS sg_partido,
      COALESCE(nr_candidato, numero_urna) AS nr_candidato,
      COALESCE(ds_cargo, cargo) AS ds_cargo,
      COALESCE(ano_eleicao, ano) AS ano_eleicao,
      COALESCE(sg_uf, sigla_uf, uf) AS sg_uf,
      nm_municipio_nascimento,
      COALESCE(ds_grau_instrucao, grau_instrucao) AS ds_grau_instrucao,
      COALESCE(ds_genero, genero) AS ds_genero,
      COALESCE(ds_ocupacao, ocupacao) AS ds_ocupacao,
      COALESCE(dt_nascimento, data_nascimento) AS dt_nascimento,
      nm_email,
      COALESCE(ds_sit_tot_turno, situacao_final) AS ds_sit_tot_turno
    FROM `silver-idea-389314.eleicoes_go_clean.raw_candidatos_*`
  )
  WHERE UPPER(TRIM(ds_sit_tot_turno)) IN ('SUPLENTE', 'MEDIA', 'QP', '#NULO#', '1º SUPLENTE', '2º SUPLENTE')
    AND UPPER(TRIM(COALESCE(sg_uf, ''))) = 'GO'
),

votacao AS (
  -- Total de votos por candidato (votação por seção)
  SELECT
    COALESCE(sq_candidato, sequencial_candidato) AS sq_candidato,
    COALESCE(ano_eleicao, ano) AS ano_eleicao,
    SUM(SAFE_CAST(COALESCE(qt_votos_nominais, total_votos, qt_votos) AS INT64)) AS total_votos
  FROM `silver-idea-389314.eleicoes_go_clean.raw_votacao_munzona_*`
  GROUP BY 1, 2
),

bens AS (
  -- Patrimônio total declarado
  SELECT
    COALESCE(sq_candidato, sequencial_candidato) AS sq_candidato,
    COALESCE(ano_eleicao, ano) AS ano_eleicao,
    SUM(SAFE_CAST(REPLACE(REPLACE(COALESCE(vr_bem_candidato, valor_bem, '0'), '.', ''), ',', '.') AS FLOAT64)) AS patrimonio_total,
    COUNT(*) AS qtd_bens
  FROM `silver-idea-389314.eleicoes_go_clean.raw_bens_candidatos_*`
  GROUP BY 1, 2
)

SELECT
  s.sq_candidato,
  s.nm_candidato,
  s.nm_urna_candidato,
  s.sg_partido,
  s.nr_candidato,
  s.ds_cargo,
  s.ano_eleicao,
  s.nm_municipio_nascimento,
  s.ds_grau_instrucao,
  s.ds_genero,
  s.ds_ocupacao,
  s.dt_nascimento,
  s.nm_email,
  s.ds_sit_tot_turno,
  COALESCE(v.total_votos, 0) AS total_votos,
  COALESCE(b.patrimonio_total, 0) AS patrimonio_declarado,
  COALESCE(b.qtd_bens, 0) AS qtd_bens_declarados,
  CASE
    WHEN v.total_votos > 0 AND b.patrimonio_total > 0
    THEN ROUND(b.patrimonio_total / v.total_votos, 2)
    ELSE NULL
  END AS patrimonio_por_voto

FROM suplentes s
LEFT JOIN votacao v
  ON s.sq_candidato = v.sq_candidato
  AND s.ano_eleicao = v.ano_eleicao
LEFT JOIN bens b
  ON s.sq_candidato = b.sq_candidato
  AND s.ano_eleicao = b.ano_eleicao

ORDER BY s.ano_eleicao DESC, v.total_votos DESC NULLS LAST;
