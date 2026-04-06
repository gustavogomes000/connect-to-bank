-- ============================================================
-- 🧹 LIMPEZA BIGQUERY — eleicoes_go_clean
-- Gerado: 2026-04-06
-- 
-- RESUMO DAS DECISÕES:
--   ✅ GO inteiro: candidatos, votação munzona, votação partido, coligações, vagas, dados externos
--   🏙️ GYN+APA: bens, votação seção, comparecimento (munzona+seção), boletim urna,
--               perfil eleitorado, perfil eleitor seção, eleitorado local,
--               receitas, despesas, legendas, redes sociais, filiados, mesários, CNPJ campanha
--   🗑️ DROP: tabelas vazias
--
-- CÓDIGOS TSE:
--   Goiânia     = 93734  (ou NM_MUNICIPIO = 'GOIÂNIA')
--   Aparecida   = 91758  (ou NM_MUNICIPIO = 'APARECIDA DE GOIÂNIA')
--
-- ⚠️  EXECUTE BLOCO A BLOCO, NÃO TUDO DE UMA VEZ
-- ============================================================

-- ============================================================
-- PARTE 0: DESCOBRIR TABELAS VAZIAS PARA DROP
-- ============================================================
-- Execute primeiro para confirmar quais estão vazias:
/*
SELECT table_name, 
       (SELECT COUNT(*) FROM `SEU_PROJETO.eleicoes_go_clean.` || table_name) as rows
FROM `SEU_PROJETO.eleicoes_go_clean.INFORMATION_SCHEMA.TABLES`
ORDER BY table_name;
*/

-- Script Python para listar vazias (mais prático):
-- python3 scripts/listar_vazias_bigquery.py --project SEU_PROJETO --dataset eleicoes_go_clean


-- ============================================================
-- PARTE 1: DROP DE TABELAS VAZIAS
-- ============================================================
-- (Adicione aqui as tabelas confirmadas como vazias após rodar Parte 0)
-- Exemplos comuns de vazias:
-- DROP TABLE IF EXISTS `SEU_PROJETO.eleicoes_go_clean.raw_certidao_criminal_XXXX`;
-- DROP TABLE IF EXISTS `SEU_PROJETO.eleicoes_go_clean.raw_extrato_bancario_XXXX`;


-- ============================================================
-- PARTE 2: FILTRAR GYN+APA — TABELAS COM CD_MUNICIPIO
-- ============================================================
-- Padrão: CREATE OR REPLACE (comprime + filtra de uma vez)
-- A coluna de município varia por tipo de arquivo TSE.
-- Verifique com: SELECT * FROM tabela LIMIT 5

-- ────────────────────────────────────────────────────────────
-- 2A. BENS DE CANDIDATOS → GYN+APA
-- Coluna provável: CD_MUNICIPIO_NASCIMENTO ou SQ_CANDIDATO (join com candidatos)
-- Como bens não tem CD_MUNICIPIO direto, filtrar via JOIN com candidatos:
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2014` AS
SELECT b.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2014` b
JOIN `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2014` c
  ON b.SQ_CANDIDATO = c.SQ_CANDIDATO
WHERE c.CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2016` AS
SELECT b.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2016` b
JOIN `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2016` c
  ON b.SQ_CANDIDATO = c.SQ_CANDIDATO
WHERE c.CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2018` AS
SELECT b.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2018` b
JOIN `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2018` c
  ON b.SQ_CANDIDATO = c.SQ_CANDIDATO
WHERE c.CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2020` AS
SELECT b.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2020` b
JOIN `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2020` c
  ON b.SQ_CANDIDATO = c.SQ_CANDIDATO
WHERE c.CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2022` AS
SELECT b.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2022` b
JOIN `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2022` c
  ON b.SQ_CANDIDATO = c.SQ_CANDIDATO
WHERE c.CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2024` AS
SELECT b.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_bens_candidatos_2024` b
JOIN `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2024` c
  ON b.SQ_CANDIDATO = c.SQ_CANDIDATO
WHERE c.CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2B. VOTAÇÃO POR SEÇÃO → GYN+APA
-- Coluna: CD_MUNICIPIO
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2016` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2016`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2018` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2018`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2C. COMPARECIMENTO MUNZONA → GYN+APA
-- Coluna: CD_MUNICIPIO
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2016` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2016`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2018` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2018`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2D. COMPARECIMENTO SEÇÃO → GYN+APA
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_secao_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_secao_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_secao_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_secao_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_secao_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_secao_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2E. BOLETIM DE URNA → GYN+APA
-- Coluna: CD_MUNICIPIO
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2018_t1` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2018_t1`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2018_t2` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2018_t2`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2020_t1` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2020_t1`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2020_t2` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2020_t2`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2022_t1` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2022_t1`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2022_t2` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2022_t2`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2024_t1` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2024_t1`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2024_t2` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_boletim_urna_2024_t2`
WHERE CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2F. PERFIL DO ELEITORADO → GYN+APA
-- Coluna: CD_MUNICIPIO
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2016` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2016`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2018` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2018`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitorado_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2G. PERFIL ELEITOR SEÇÃO → GYN+APA
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitor_secao_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitor_secao_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitor_secao_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitor_secao_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitor_secao_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_perfil_eleitor_secao_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2H. ELEITORADO LOCAL → GYN+APA
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_eleitorado_local_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_eleitorado_local_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_eleitorado_local_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_eleitorado_local_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_eleitorado_local_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_eleitorado_local_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2I. RECEITAS → GYN+APA
-- Coluna provável: CD_MUNICIPIO ou SQ_CANDIDATO (join)
-- Receitas podem ter CD_MUNICIPIO direto no TSE
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2016` AS
SELECT r.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2016` r
WHERE r.CD_MUNICIPIO IN ('93734', '91758')
   OR r.SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2018` AS
SELECT r.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2018` r
WHERE r.CD_MUNICIPIO IN ('93734', '91758')
   OR r.SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2020` AS
SELECT r.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2020` r
WHERE r.CD_MUNICIPIO IN ('93734', '91758')
   OR r.SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2022` AS
SELECT r.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2022` r
WHERE r.CD_MUNICIPIO IN ('93734', '91758')
   OR r.SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2024` AS
SELECT r.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2024` r
WHERE r.CD_MUNICIPIO IN ('93734', '91758')
   OR r.SG_UE IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2J. DESPESAS → GYN+APA
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2016` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2016`
WHERE CD_MUNICIPIO IN ('93734', '91758')
   OR SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2018` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2018`
WHERE CD_MUNICIPIO IN ('93734', '91758')
   OR SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758')
   OR SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758')
   OR SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_despesas_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758')
   OR SG_UE IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2K. LEGENDAS → GYN+APA
-- Coluna: SG_UE (código da unidade eleitoral)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_legendas_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_legendas_2022`
WHERE SG_UE IN ('93734', '91758') OR CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_legendas_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_legendas_2024`
WHERE SG_UE IN ('93734', '91758') OR CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2L. REDES SOCIAIS → GYN+APA (via JOIN candidatos)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_redes_sociais_2022` AS
SELECT r.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_redes_sociais_2022` r
JOIN `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2022` c
  ON r.SQ_CANDIDATO = c.SQ_CANDIDATO
WHERE c.CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_redes_sociais_2024` AS
SELECT r.* FROM `SEU_PROJETO.eleicoes_go_clean.raw_redes_sociais_2024` r
JOIN `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2024` c
  ON r.SQ_CANDIDATO = c.SQ_CANDIDATO
WHERE c.CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2M. FILIADOS → GYN+APA
-- Coluna provável: NM_MUNICIPIO ou CD_MUNICIPIO
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_filiados_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_filiados_2024`
WHERE UPPER(NM_MUNICIPIO) IN ('GOIÂNIA', 'GOIANIA', 'APARECIDA DE GOIÂNIA', 'APARECIDA DE GOIANIA')
   OR CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2N. MESÁRIOS → GYN+APA
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_mesarios_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_mesarios_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_mesarios_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_mesarios_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_mesarios_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_mesarios_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758');


-- ────────────────────────────────────────────────────────────
-- 2O. CNPJ CAMPANHA → GYN+APA
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_cnpj_campanha_2020` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_cnpj_campanha_2020`
WHERE CD_MUNICIPIO IN ('93734', '91758')
   OR SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_cnpj_campanha_2022` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_cnpj_campanha_2022`
WHERE CD_MUNICIPIO IN ('93734', '91758')
   OR SG_UE IN ('93734', '91758');

CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_cnpj_campanha_2024` AS
SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_cnpj_campanha_2024`
WHERE CD_MUNICIPIO IN ('93734', '91758')
   OR SG_UE IN ('93734', '91758');


-- ============================================================
-- PARTE 3: COMPRIMIR TABELAS QUE FICAM GO INTEIRO
-- (CREATE OR REPLACE sem WHERE = recompacta storage)
-- ============================================================

-- Candidatos
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2012` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2012`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2014` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2014`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2016` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2016`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2018` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2018`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2020` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2020`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2022` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2022`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2024` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_2024`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_complementar_2020` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_complementar_2020`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_complementar_2022` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_complementar_2022`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_complementar_2024` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_candidatos_complementar_2024`;

-- Votação munzona (GO inteiro)
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2012` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2012`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2014` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2014`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2016` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2016`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2018` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2018`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2020` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2020`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2022` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2022`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2024` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_munzona_2024`;

-- Votação partido (GO inteiro)
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2016` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2016`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2018` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2018`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2020` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2020`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2022` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2022`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2024` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_partido_munzona_2024`;

-- Coligações (GO inteiro)
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2016` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2016`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2018` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2018`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2020` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2020`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2022` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2022`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2024` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_coligacoes_2024`;

-- Vagas (GO inteiro)
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2016` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2016`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2018` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2018`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2020` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2020`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2022` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2022`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2024` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_vagas_2024`;

-- Dados externos (manter como estão, só comprimir)
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_municipio_tse_ibge` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_municipio_tse_ibge`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_datasus_nascimentos` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_datasus_nascimentos`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_datasus_obitos` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_datasus_obitos`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_datasus_mortalidade_infantil` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_datasus_mortalidade_infantil`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_siconfi_receitas` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_siconfi_receitas`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_siconfi_despesas` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_siconfi_despesas`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_fefc_2022` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_fefc_2022`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_fefc_2024` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_fefc_2024`;
CREATE OR REPLACE TABLE `SEU_PROJETO.eleicoes_go_clean.raw_censo_2022` AS SELECT * FROM `SEU_PROJETO.eleicoes_go_clean.raw_censo_2022`;


-- ============================================================
-- PARTE 4: VERIFICAÇÃO FINAL
-- ============================================================
-- Execute para ver o tamanho total após limpeza:
/*
SELECT 
  SUM(size_bytes) / (1024*1024*1024) AS total_gb,
  COUNT(*) AS total_tabelas
FROM `SEU_PROJETO.eleicoes_go_clean.__TABLES__`;
*/

-- Verificar que GYN+APA têm dados:
/*
SELECT 'votacao_secao_2024' as tabela, COUNT(*) as linhas 
FROM `SEU_PROJETO.eleicoes_go_clean.raw_votacao_secao_2024`
UNION ALL
SELECT 'comparecimento_munzona_2024', COUNT(*) 
FROM `SEU_PROJETO.eleicoes_go_clean.raw_comparecimento_munzona_2024`
UNION ALL
SELECT 'receitas_2024', COUNT(*) 
FROM `SEU_PROJETO.eleicoes_go_clean.raw_receitas_2024`;
*/
