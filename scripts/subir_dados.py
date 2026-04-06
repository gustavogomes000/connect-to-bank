# -*- coding: utf-8 -*-
"""
SCRIPT DE UPLOAD - Eleicoes GO
Cria todas as 21 tabelas e sobe os 21 CSVs pro Supabase.
(boletim_urna sera tratado separadamente - sem headers no CSV)

USO:
  pip install psycopg2-binary
  python subir_dados.py

Voce precisa da connection string do Supabase:
  Dashboard > Settings > Database > Connection string > URI
"""
import psycopg2
import os
import sys
import time
import io

# ============================================================
# CONFIGURACAO - ALTERE AQUI
# ============================================================
PASTA = r"C:\Users\Gustavo\Desktop\dados_organizados\banco_de_dados"

# Cole aqui a connection string do Supabase (URI mode)
# Exemplo: postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
DB_URL = ""

# ============================================================
# MAPEAMENTO DE COLUNAS (CSV header -> coluna no banco)
# ============================================================
COLUNAS = {
    "candidatos": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "nr_turno", "cd_eleicao", "ds_eleicao", "dt_eleicao", "tp_abrangencia", "sg_uf", "sg_ue", "nm_ue", "cd_cargo", "ds_cargo", "sq_candidato", "nr_candidato", "nm_candidato", "nm_urna_candidato", "nm_social_candidato", "nr_cpf_candidato", "nm_email", "cd_situacao_candidatura", "ds_situacao_candidatura", "cd_detalhe_situacao_cand", "ds_detalhe_situacao_cand", "tp_agremiacao", "nr_partido", "sg_partido", "nm_partido", "sq_coligacao", "nm_coligacao", "ds_composicao_coligacao", "cd_nacionalidade", "ds_nacionalidade", "sg_uf_nascimento", "cd_municipio_nascimento", "nm_municipio_nascimento", "dt_nascimento", "nr_idade_data_posse", "nr_titulo_eleitoral_candidato", "cd_genero", "ds_genero", "cd_grau_instrucao", "ds_grau_instrucao", "cd_estado_civil", "ds_estado_civil", "cd_cor_raca", "ds_cor_raca", "cd_ocupacao", "ds_ocupacao", "vr_despesa_max_campanha", "cd_sit_tot_turno", "ds_sit_tot_turno", "st_reeleicao", "st_declarar_bens", "nr_protocolo_candidatura", "nr_processo", "cd_situacao_candidato_pleito", "ds_situacao_candidato_pleito", "cd_situacao_candidato_urna", "ds_situacao_candidato_urna", "st_candidato_inserido_urna"],
    "candidatos_complementar": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_eleicao", "sq_candidato", "cd_detalhe_situacao_cand", "ds_detalhe_situacao_cand", "cd_nacionalidade", "ds_nacionalidade", "cd_municipio_nascimento", "nm_municipio_nascimento", "nr_idade_data_posse", "st_quilombola", "cd_etnia_indigena", "ds_etnia_indigena", "vr_despesa_max_campanha", "st_reeleicao", "st_declarar_bens", "nr_protocolo_candidatura", "nr_processo", "cd_situacao_candidato_pleito", "ds_situacao_candidato_pleito", "cd_situacao_candidato_urna", "ds_situacao_candidato_urna", "st_candidato_inserido_urna", "nm_tipo_destinacao_votos", "cd_situacao_candidato_tot", "ds_situacao_candidato_tot", "st_prest_contas", "st_substituido", "sq_substituido", "sq_ordem_suplencia", "dt_aceite_candidatura", "cd_situacao_julgamento", "ds_situacao_julgamento", "cd_situacao_julgamento_pleito", "ds_situacao_julgamento_pleito", "cd_situacao_julgamento_urna", "ds_situacao_julgamento_urna", "cd_situacao_cassacao", "ds_situacao_cassacao", "cd_situacao_cassacao_midia", "ds_situacao_cassacao_midia", "cd_situacao_diploma", "ds_situacao_diploma"],
    "cassacoes": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "cd_eleicao", "ds_eleicao", "sg_uf", "sg_ue", "nm_ue", "sq_candidato", "ds_motivo_cassacao"],
    "coligacoes": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "nr_turno", "cd_eleicao", "ds_eleicao", "dt_eleicao", "sg_uf", "sg_ue", "nm_ue", "cd_cargo", "ds_cargo", "tp_agremiacao", "nr_partido", "sg_partido", "nm_partido", "nr_federacao", "nm_federacao", "sg_federacao", "ds_composicao_federacao", "sq_coligacao", "nm_coligacao", "ds_composicao_coligacao", "cd_situacao_legenda", "ds_situacao", "nm_tipo_destinacao_votos"],
    "comparecimento": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "nr_turno", "cd_eleicao", "ds_eleicao", "dt_eleicao", "tp_abrangencia", "sg_uf", "sg_ue", "nm_ue", "cd_municipio", "nm_municipio", "nr_zona", "cd_cargo", "ds_cargo", "qt_aptos", "qt_secoes_principais", "qt_secoes_agregadas", "qt_secoes_nao_instaladas", "qt_total_secoes", "qt_comparecimento", "qt_eleitores_secoes_nao_instaladas", "qt_abstencoes", "st_voto_em_transito", "qt_votos", "qt_votos_concorrentes", "qt_total_votos_validos", "qt_votos_nominais_validos", "qt_total_votos_leg_validos", "qt_votos_leg_validos", "qt_votos_nom_convr_leg_validos", "qt_total_votos_anulados", "qt_votos_nominais_anulados", "qt_votos_legenda_anulados", "qt_total_votos_anul_subjud", "qt_votos_nominais_anul_subjud", "qt_votos_legenda_anul_subjud", "qt_votos_brancos", "qt_total_votos_nulos", "qt_votos_nulos", "qt_votos_nulos_tecnicos", "qt_votos_anulados_apu_sep", "hh_ultima_totalizacao", "dt_ultima_totalizacao"],
    "comparecimento_abstencao": ["dt_geracao", "hh_geracao", "ano_eleicao", "nr_turno", "sg_uf", "cd_municipio", "nm_municipio", "nr_zona", "cd_genero", "ds_genero", "cd_estado_civil", "ds_estado_civil", "cd_faixa_etaria", "ds_faixa_etaria", "cd_grau_escolaridade", "ds_grau_escolaridade", "cd_cor_raca", "ds_cor_raca", "cd_quilombola", "ds_quilombola", "cd_interprete_libras", "ds_interprete_libras", "cd_identidade_genero", "ds_identidade_genero", "cd_idioma_indigena", "ds_idioma_indigena", "cd_grupo_indigena", "ds_grupo_indigena", "qt_aptos", "qt_comparecimento", "qt_abstencao", "qt_comparecimento_deficiencia", "qt_abstencao_deficiencia", "qt_comparecimento_tte", "qt_abstencao_tte", "qt_comparec_facultativo", "qt_abst_facultativo", "qt_comparec_obrigatorio", "qt_abst_obrigatorio", "qt_comparec_defic_facultativo", "qt_abst_defic_facultativo", "qt_comparec_defic_obrigatorio", "qt_abst_defic_obrigatorio"],
    "despesas": ["cod_eleicao", "desc_eleicao", "data_e_hora", "cnpj_prestador_conta", "sequencial_candidato", "uf", "sigla_partido", "numero_candidato", "cargo", "nome_candidato", "cpf_do_candidato", "tipo_do_documento", "numero_do_documento", "cpf_cnpj_do_fornecedor", "nome_do_fornecedor", "nome_do_fornecedor_receita_federal", "cod_setor_economico_do_fornecedor", "setor_economico_do_fornecedor", "data_da_despesa", "valor_despesa", "tipo_despesa", "descricao_da_despesa"],
    "despesas_contratadas": ["dt_geracao", "hh_geracao", "aa_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "cd_eleicao", "ds_eleicao", "dt_eleicao", "st_turno", "tp_prestacao_contas", "dt_prestacao_contas", "sq_prestador_contas", "sg_uf", "sg_ue", "nm_ue", "nr_cnpj_prestador_conta", "cd_cargo", "ds_cargo", "sq_candidato", "nr_candidato", "nm_candidato", "nr_cpf_candidato", "nr_cpf_vice_candidato", "nr_partido", "sg_partido", "nm_partido", "cd_tipo_fornecedor", "ds_tipo_fornecedor", "cd_cnae_fornecedor", "ds_cnae_fornecedor", "nr_cpf_cnpj_fornecedor", "nm_fornecedor", "nm_fornecedor_rfb", "cd_esfera_part_fornecedor", "ds_esfera_part_fornecedor", "sg_uf_fornecedor", "cd_municipio_fornecedor", "nm_municipio_fornecedor", "sq_candidato_fornecedor", "nr_candidato_fornecedor", "cd_cargo_fornecedor", "ds_cargo_fornecedor", "nr_partido_fornecedor", "sg_partido_fornecedor", "nm_partido_fornecedor", "ds_tipo_documento", "nr_documento", "cd_origem_despesa", "ds_origem_despesa", "sq_despesa", "dt_despesa", "ds_despesa", "vr_despesa_contratada"],
    "despesas_pagas": ["dt_geracao", "hh_geracao", "aa_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "cd_eleicao", "ds_eleicao", "dt_eleicao", "st_turno", "tp_prestacao_contas", "dt_prestacao_contas", "sq_prestador_contas", "sg_uf", "ds_tipo_documento", "nr_documento", "cd_fonte_despesa", "ds_fonte_despesa", "cd_origem_despesa", "ds_origem_despesa", "cd_natureza_despesa", "ds_natureza_despesa", "cd_especie_recurso", "ds_especie_recurso", "sq_despesa", "sq_parcelamento_despesa", "dt_pagto_despesa", "ds_despesa", "vr_pagto_despesa"],
    "eleitorado_local": ["dt_geracao", "hh_geracao", "aa_eleicao", "dt_eleicao", "ds_eleicao", "nr_turno", "sg_uf", "cd_municipio", "nm_municipio", "nr_zona", "nr_secao", "cd_tipo_secao_agregada", "ds_tipo_secao_agregada", "nr_secao_principal", "nr_local_votacao", "nm_local_votacao", "cd_tipo_local", "ds_tipo_local", "ds_endereco", "nm_bairro", "nr_cep", "nr_telefone_local", "nr_latitude", "nr_longitude", "cd_situ_local_votacao", "ds_situ_local_votacao", "cd_situ_zona", "ds_situ_zona", "cd_situ_secao", "ds_situ_secao", "cd_situ_localidade", "ds_situ_localidade", "cd_situ_secao_acessibilidade", "ds_situ_secao_acessibilidade", "qt_eleitor_secao", "qt_eleitor_eleicao_federal", "qt_eleitor_eleicao_estadual", "qt_eleitor_eleicao_municipal", "nr_local_votacao_original", "nm_local_votacao_original", "ds_endereco_locvt_original"],
    "mesarios": ["dt_geracao", "hh_geracao", "ano_eleicao", "nr_turno", "sg_uf", "cd_municipio", "nm_municipio", "nr_zona", "ds_tipo_mesario", "ds_atividade_eleitoral", "cd_genero", "ds_genero", "cd_estado_civil", "ds_estado_civil", "cd_faixa_etaria", "ds_faixa_etaria", "cd_grau_instrucao", "ds_grau_instrucao", "cd_cor_raca", "ds_cor_raca", "cd_quilombola", "ds_quilombola", "cd_interprete_libras", "ds_interprete_libras", "cd_identidade_genero", "ds_identidade_genero", "st_voluntario", "st_comparecimento", "qt_convocados_perfil"],
    "perfil_eleitor_secao": ["dt_geracao", "hh_geracao", "ano_eleicao", "sg_uf", "cd_municipio", "nm_municipio", "nr_zona", "nr_secao", "nr_local_votacao", "nm_local_votacao", "cd_genero", "ds_genero", "cd_estado_civil", "ds_estado_civil", "cd_faixa_etaria", "ds_faixa_etaria", "cd_grau_escolaridade", "ds_grau_escolaridade", "cd_raca_cor", "ds_raca_cor", "cd_identidade_genero", "ds_identidade_genero", "cd_quilombola", "ds_quilombola", "cd_interprete_libras", "ds_interprete_libras", "tp_obrigatoriedade_voto", "qt_eleitores_perfil", "qt_eleitores_biometria", "qt_eleitores_deficiencia", "qt_eleitores_inc_nm_social"],
    "perfil_eleitorado": ["dt_geracao", "hh_geracao", "ano_eleicao", "sg_uf", "cd_municipio", "nm_municipio", "cd_mun_sit_biometrica", "ds_mun_sit_biometrica", "nr_zona", "cd_genero", "ds_genero", "cd_estado_civil", "ds_estado_civil", "cd_faixa_etaria", "ds_faixa_etaria", "cd_grau_escolaridade", "ds_grau_escolaridade", "qt_eleitores_perfil", "qt_eleitores_biometria", "qt_eleitores_deficiencia", "qt_eleitores_inc_nm_social"],
    "pesquisas": ["dt_geracao", "hh_geracao", "aa_eleicao", "cd_eleicao", "nm_eleicao", "sg_uf", "sg_ue", "nm_ue", "nr_protocolo_registro", "dt_registro", "st_pesquisa_propria", "nr_cnpj_empresa", "nm_empresa", "nm_empresa_fantasia", "ds_cargo", "dt_inicio_pesquisa", "dt_fim_pesquisa", "qt_entrevistado", "cd_conre", "nm_estatistico_resp", "vr_pesquisa", "ds_metodologia_pesquisa", "ds_plano_amostral", "ds_sistema_controle", "ds_dado_municipio"],
    "receitas": ["cod_eleicao", "desc_eleicao", "data_e_hora", "cnpj_prestador_conta", "sequencial_candidato", "uf", "sigla_partido", "numero_candidato", "cargo", "nome_candidato", "cpf_do_candidato", "numero_recibo_eleitoral", "numero_do_documento", "cpf_cnpj_do_doador", "nome_do_doador", "nome_do_doador_receita_federal", "sigla_ue_doador", "numero_partido_doador", "numero_candidato_doador", "cod_setor_economico_do_doador", "setor_economico_do_doador", "data_da_receita", "valor_receita", "tipo_receita", "fonte_recurso", "especie_recurso", "descricao_da_receita", "cpf_cnpj_do_doador_originario", "nome_do_doador_originario", "tipo_doador_originario", "setor_economico_do_doador_originario", "nome_do_doador_originario_receita_federal"],
    "redes_sociais": ["dt_geracao", "hh_geracao", "aa_eleicao", "sg_uf", "cd_tipo_eleicao", "nm_tipo_eleicao", "cd_eleicao", "ds_eleicao", "sq_candidato", "nr_ordem_rede_social", "ds_url"],
    "vagas": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "cd_eleicao", "ds_eleicao", "dt_eleicao", "dt_posse", "sg_uf", "sg_ue", "nm_ue", "cd_cargo", "ds_cargo", "qt_vaga"],
    "bens_candidatos": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "cd_eleicao", "ds_eleicao", "dt_eleicao", "sg_uf", "sg_ue", "nm_ue", "sq_candidato", "nr_ordem_bem_candidato", "cd_tipo_bem_candidato", "ds_tipo_bem_candidato", "ds_bem_candidato", "vr_bem_candidato", "dt_ult_atual_bem_candidato", "hh_ult_atual_bem_candidato"],
    "votacao": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "nr_turno", "cd_eleicao", "ds_eleicao", "dt_eleicao", "tp_abrangencia", "sg_uf", "sg_ue", "nm_ue", "cd_municipio", "nm_municipio", "nr_zona", "cd_cargo", "ds_cargo", "sq_candidato", "nr_candidato", "nm_candidato", "nm_urna_candidato", "nm_social_candidato", "cd_situacao_candidatura", "ds_situacao_candidatura", "cd_detalhe_situacao_cand", "ds_detalhe_situacao_cand", "tp_agremiacao", "nr_partido", "sg_partido", "nm_partido", "sq_coligacao", "nm_coligacao", "ds_composicao_coligacao", "cd_sit_tot_turno", "ds_sit_tot_turno", "st_voto_em_transito", "qt_votos_nominais"],
    "votacao_partido": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "nr_turno", "cd_eleicao", "ds_eleicao", "dt_eleicao", "tp_abrangencia", "sg_uf", "sg_ue", "nm_ue", "cd_municipio", "nm_municipio", "nr_zona", "cd_cargo", "ds_cargo", "tp_agremiacao", "nr_partido", "sg_partido", "nm_partido", "sq_coligacao", "nm_coligacao", "ds_composicao_coligacao", "st_voto_em_transito", "qt_votos_nominais", "qt_votos_legenda"],
    "votacao_secao": ["dt_geracao", "hh_geracao", "ano_eleicao", "cd_tipo_eleicao", "nm_tipo_eleicao", "nr_turno", "cd_eleicao", "ds_eleicao", "dt_eleicao", "tp_abrangencia", "sg_uf", "sg_ue", "nm_ue", "cd_municipio", "nm_municipio", "nr_zona", "nr_secao", "cd_cargo", "ds_cargo", "qt_aptos", "qt_comparecimento", "qt_abstencoes", "qt_votos_nominais", "qt_votos_brancos", "qt_votos_nulos", "qt_votos_legenda", "qt_votos_anulados_apu_sep", "nr_local_votacao"]
}

# Ordem de upload (menores primeiro)
ORDEM = [
    ("vagas", 3758),
    ("cassacoes", 3885),
    ("comparecimento", 8693),
    ("pesquisas", 34457),
    ("coligacoes", 39427),
    ("redes_sociais", 44402),
    ("candidatos_complementar", 46235),
    ("votacao_partido", 124632),
    ("candidatos", 180882),
    ("eleitorado_local", 217387),
    ("bens_candidatos", 292811),
    ("mesarios", 346188),
    ("receitas", 865446),
    ("despesas_pagas", 929074),
    ("despesas", 1155856),
    ("despesas_contratadas", 1180678),
    ("votacao", 1751886),
    ("perfil_eleitorado", 1807952),
    ("comparecimento_abstencao", 2712632),
    ("perfil_eleitor_secao", 22352332),
    ("votacao_secao", 25375357)
]

# ============================================================
# SQL DE CRIACAO DAS TABELAS
# ============================================================

def get_create_sql():
    """Retorna o SQL completo para criar todas as tabelas"""
    return """
-- candidatos (63 colunas)
DROP TABLE IF EXISTS bd_eleicoes_candidatos CASCADE;
CREATE TABLE bd_eleicoes_candidatos (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  nr_turno text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  tp_abrangencia text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  cd_cargo text,
  ds_cargo text,
  sq_candidato text,
  nr_candidato text,
  nm_candidato text,
  nm_urna_candidato text,
  nm_social_candidato text,
  nr_cpf_candidato text,
  nm_email text,
  cd_situacao_candidatura text,
  ds_situacao_candidatura text,
  cd_detalhe_situacao_cand text,
  ds_detalhe_situacao_cand text,
  tp_agremiacao text,
  nr_partido text,
  sg_partido text,
  nm_partido text,
  sq_coligacao text,
  nm_coligacao text,
  ds_composicao_coligacao text,
  cd_nacionalidade text,
  ds_nacionalidade text,
  sg_uf_nascimento text,
  cd_municipio_nascimento text,
  nm_municipio_nascimento text,
  dt_nascimento text,
  nr_idade_data_posse text,
  nr_titulo_eleitoral_candidato text,
  cd_genero text,
  ds_genero text,
  cd_grau_instrucao text,
  ds_grau_instrucao text,
  cd_estado_civil text,
  ds_estado_civil text,
  cd_cor_raca text,
  ds_cor_raca text,
  cd_ocupacao text,
  ds_ocupacao text,
  vr_despesa_max_campanha text,
  cd_sit_tot_turno text,
  ds_sit_tot_turno text,
  st_reeleicao text,
  st_declarar_bens text,
  nr_protocolo_candidatura text,
  nr_processo text,
  cd_situacao_candidato_pleito text,
  ds_situacao_candidato_pleito text,
  cd_situacao_candidato_urna text,
  ds_situacao_candidato_urna text,
  st_candidato_inserido_urna text
);
ALTER TABLE bd_eleicoes_candidatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica candidatos" ON bd_eleicoes_candidatos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia candidatos" ON bd_eleicoes_candidatos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- candidatos_complementar (45 colunas)
DROP TABLE IF EXISTS bd_eleicoes_candidatos_complementar CASCADE;
CREATE TABLE bd_eleicoes_candidatos_complementar (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_eleicao text,
  sq_candidato text,
  cd_detalhe_situacao_cand text,
  ds_detalhe_situacao_cand text,
  cd_nacionalidade text,
  ds_nacionalidade text,
  cd_municipio_nascimento text,
  nm_municipio_nascimento text,
  nr_idade_data_posse text,
  st_quilombola text,
  cd_etnia_indigena text,
  ds_etnia_indigena text,
  vr_despesa_max_campanha text,
  st_reeleicao text,
  st_declarar_bens text,
  nr_protocolo_candidatura text,
  nr_processo text,
  cd_situacao_candidato_pleito text,
  ds_situacao_candidato_pleito text,
  cd_situacao_candidato_urna text,
  ds_situacao_candidato_urna text,
  st_candidato_inserido_urna text,
  nm_tipo_destinacao_votos text,
  cd_situacao_candidato_tot text,
  ds_situacao_candidato_tot text,
  st_prest_contas text,
  st_substituido text,
  sq_substituido text,
  sq_ordem_suplencia text,
  dt_aceite_candidatura text,
  cd_situacao_julgamento text,
  ds_situacao_julgamento text,
  cd_situacao_julgamento_pleito text,
  ds_situacao_julgamento_pleito text,
  cd_situacao_julgamento_urna text,
  ds_situacao_julgamento_urna text,
  cd_situacao_cassacao text,
  ds_situacao_cassacao text,
  cd_situacao_cassacao_midia text,
  ds_situacao_cassacao_midia text,
  cd_situacao_diploma text,
  ds_situacao_diploma text
);
ALTER TABLE bd_eleicoes_candidatos_complementar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica candidatos_complementar" ON bd_eleicoes_candidatos_complementar FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia candidatos_complementar" ON bd_eleicoes_candidatos_complementar FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- cassacoes (12 colunas)
DROP TABLE IF EXISTS bd_eleicoes_cassacoes CASCADE;
CREATE TABLE bd_eleicoes_cassacoes (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  cd_eleicao text,
  ds_eleicao text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  sq_candidato text,
  ds_motivo_cassacao text
);
ALTER TABLE bd_eleicoes_cassacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica cassacoes" ON bd_eleicoes_cassacoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia cassacoes" ON bd_eleicoes_cassacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- coligacoes (28 colunas)
DROP TABLE IF EXISTS bd_eleicoes_coligacoes CASCADE;
CREATE TABLE bd_eleicoes_coligacoes (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  nr_turno text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  cd_cargo text,
  ds_cargo text,
  tp_agremiacao text,
  nr_partido text,
  sg_partido text,
  nm_partido text,
  nr_federacao text,
  nm_federacao text,
  sg_federacao text,
  ds_composicao_federacao text,
  sq_coligacao text,
  nm_coligacao text,
  ds_composicao_coligacao text,
  cd_situacao_legenda text,
  ds_situacao text,
  nm_tipo_destinacao_votos text
);
ALTER TABLE bd_eleicoes_coligacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica coligacoes" ON bd_eleicoes_coligacoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia coligacoes" ON bd_eleicoes_coligacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- comparecimento (47 colunas)
DROP TABLE IF EXISTS bd_eleicoes_comparecimento CASCADE;
CREATE TABLE bd_eleicoes_comparecimento (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  nr_turno text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  tp_abrangencia text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  cd_municipio text,
  nm_municipio text,
  nr_zona text,
  cd_cargo text,
  ds_cargo text,
  qt_aptos text,
  qt_secoes_principais text,
  qt_secoes_agregadas text,
  qt_secoes_nao_instaladas text,
  qt_total_secoes text,
  qt_comparecimento text,
  qt_eleitores_secoes_nao_instaladas text,
  qt_abstencoes text,
  st_voto_em_transito text,
  qt_votos text,
  qt_votos_concorrentes text,
  qt_total_votos_validos text,
  qt_votos_nominais_validos text,
  qt_total_votos_leg_validos text,
  qt_votos_leg_validos text,
  qt_votos_nom_convr_leg_validos text,
  qt_total_votos_anulados text,
  qt_votos_nominais_anulados text,
  qt_votos_legenda_anulados text,
  qt_total_votos_anul_subjud text,
  qt_votos_nominais_anul_subjud text,
  qt_votos_legenda_anul_subjud text,
  qt_votos_brancos text,
  qt_total_votos_nulos text,
  qt_votos_nulos text,
  qt_votos_nulos_tecnicos text,
  qt_votos_anulados_apu_sep text,
  hh_ultima_totalizacao text,
  dt_ultima_totalizacao text
);
ALTER TABLE bd_eleicoes_comparecimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica comparecimento" ON bd_eleicoes_comparecimento FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia comparecimento" ON bd_eleicoes_comparecimento FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- comparecimento_abstencao (43 colunas)
DROP TABLE IF EXISTS bd_eleicoes_comparecimento_abstencao CASCADE;
CREATE TABLE bd_eleicoes_comparecimento_abstencao (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  nr_turno text,
  sg_uf text,
  cd_municipio text,
  nm_municipio text,
  nr_zona text,
  cd_genero text,
  ds_genero text,
  cd_estado_civil text,
  ds_estado_civil text,
  cd_faixa_etaria text,
  ds_faixa_etaria text,
  cd_grau_escolaridade text,
  ds_grau_escolaridade text,
  cd_cor_raca text,
  ds_cor_raca text,
  cd_quilombola text,
  ds_quilombola text,
  cd_interprete_libras text,
  ds_interprete_libras text,
  cd_identidade_genero text,
  ds_identidade_genero text,
  cd_idioma_indigena text,
  ds_idioma_indigena text,
  cd_grupo_indigena text,
  ds_grupo_indigena text,
  qt_aptos text,
  qt_comparecimento text,
  qt_abstencao text,
  qt_comparecimento_deficiencia text,
  qt_abstencao_deficiencia text,
  qt_comparecimento_tte text,
  qt_abstencao_tte text,
  qt_comparec_facultativo text,
  qt_abst_facultativo text,
  qt_comparec_obrigatorio text,
  qt_abst_obrigatorio text,
  qt_comparec_defic_facultativo text,
  qt_abst_defic_facultativo text,
  qt_comparec_defic_obrigatorio text,
  qt_abst_defic_obrigatorio text
);
ALTER TABLE bd_eleicoes_comparecimento_abstencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica comparecimento_abstencao" ON bd_eleicoes_comparecimento_abstencao FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia comparecimento_abstencao" ON bd_eleicoes_comparecimento_abstencao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- despesas (22 colunas)
DROP TABLE IF EXISTS bd_eleicoes_despesas CASCADE;
CREATE TABLE bd_eleicoes_despesas (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  cod_eleicao text,
  desc_eleicao text,
  data_e_hora text,
  cnpj_prestador_conta text,
  sequencial_candidato text,
  uf text,
  sigla_partido text,
  numero_candidato text,
  cargo text,
  nome_candidato text,
  cpf_do_candidato text,
  tipo_do_documento text,
  numero_do_documento text,
  cpf_cnpj_do_fornecedor text,
  nome_do_fornecedor text,
  nome_do_fornecedor_receita_federal text,
  cod_setor_economico_do_fornecedor text,
  setor_economico_do_fornecedor text,
  data_da_despesa text,
  valor_despesa text,
  tipo_despesa text,
  descricao_da_despesa text
);
ALTER TABLE bd_eleicoes_despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica despesas" ON bd_eleicoes_despesas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia despesas" ON bd_eleicoes_despesas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- despesas_contratadas (53 colunas)
DROP TABLE IF EXISTS bd_eleicoes_despesas_contratadas CASCADE;
CREATE TABLE bd_eleicoes_despesas_contratadas (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  aa_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  st_turno text,
  tp_prestacao_contas text,
  dt_prestacao_contas text,
  sq_prestador_contas text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  nr_cnpj_prestador_conta text,
  cd_cargo text,
  ds_cargo text,
  sq_candidato text,
  nr_candidato text,
  nm_candidato text,
  nr_cpf_candidato text,
  nr_cpf_vice_candidato text,
  nr_partido text,
  sg_partido text,
  nm_partido text,
  cd_tipo_fornecedor text,
  ds_tipo_fornecedor text,
  cd_cnae_fornecedor text,
  ds_cnae_fornecedor text,
  nr_cpf_cnpj_fornecedor text,
  nm_fornecedor text,
  nm_fornecedor_rfb text,
  cd_esfera_part_fornecedor text,
  ds_esfera_part_fornecedor text,
  sg_uf_fornecedor text,
  cd_municipio_fornecedor text,
  nm_municipio_fornecedor text,
  sq_candidato_fornecedor text,
  nr_candidato_fornecedor text,
  cd_cargo_fornecedor text,
  ds_cargo_fornecedor text,
  nr_partido_fornecedor text,
  sg_partido_fornecedor text,
  nm_partido_fornecedor text,
  ds_tipo_documento text,
  nr_documento text,
  cd_origem_despesa text,
  ds_origem_despesa text,
  sq_despesa text,
  dt_despesa text,
  ds_despesa text,
  vr_despesa_contratada text
);
ALTER TABLE bd_eleicoes_despesas_contratadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica despesas_contratadas" ON bd_eleicoes_despesas_contratadas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia despesas_contratadas" ON bd_eleicoes_despesas_contratadas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- despesas_pagas (28 colunas)
DROP TABLE IF EXISTS bd_eleicoes_despesas_pagas CASCADE;
CREATE TABLE bd_eleicoes_despesas_pagas (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  aa_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  st_turno text,
  tp_prestacao_contas text,
  dt_prestacao_contas text,
  sq_prestador_contas text,
  sg_uf text,
  ds_tipo_documento text,
  nr_documento text,
  cd_fonte_despesa text,
  ds_fonte_despesa text,
  cd_origem_despesa text,
  ds_origem_despesa text,
  cd_natureza_despesa text,
  ds_natureza_despesa text,
  cd_especie_recurso text,
  ds_especie_recurso text,
  sq_despesa text,
  sq_parcelamento_despesa text,
  dt_pagto_despesa text,
  ds_despesa text,
  vr_pagto_despesa text
);
ALTER TABLE bd_eleicoes_despesas_pagas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica despesas_pagas" ON bd_eleicoes_despesas_pagas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia despesas_pagas" ON bd_eleicoes_despesas_pagas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- eleitorado_local (41 colunas)
DROP TABLE IF EXISTS bd_eleicoes_eleitorado_local CASCADE;
CREATE TABLE bd_eleicoes_eleitorado_local (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  aa_eleicao text,
  dt_eleicao text,
  ds_eleicao text,
  nr_turno text,
  sg_uf text,
  cd_municipio text,
  nm_municipio text,
  nr_zona text,
  nr_secao text,
  cd_tipo_secao_agregada text,
  ds_tipo_secao_agregada text,
  nr_secao_principal text,
  nr_local_votacao text,
  nm_local_votacao text,
  cd_tipo_local text,
  ds_tipo_local text,
  ds_endereco text,
  nm_bairro text,
  nr_cep text,
  nr_telefone_local text,
  nr_latitude text,
  nr_longitude text,
  cd_situ_local_votacao text,
  ds_situ_local_votacao text,
  cd_situ_zona text,
  ds_situ_zona text,
  cd_situ_secao text,
  ds_situ_secao text,
  cd_situ_localidade text,
  ds_situ_localidade text,
  cd_situ_secao_acessibilidade text,
  ds_situ_secao_acessibilidade text,
  qt_eleitor_secao text,
  qt_eleitor_eleicao_federal text,
  qt_eleitor_eleicao_estadual text,
  qt_eleitor_eleicao_municipal text,
  nr_local_votacao_original text,
  nm_local_votacao_original text,
  ds_endereco_locvt_original text
);
ALTER TABLE bd_eleicoes_eleitorado_local ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica eleitorado_local" ON bd_eleicoes_eleitorado_local FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia eleitorado_local" ON bd_eleicoes_eleitorado_local FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- mesarios (29 colunas)
DROP TABLE IF EXISTS bd_eleicoes_mesarios CASCADE;
CREATE TABLE bd_eleicoes_mesarios (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  nr_turno text,
  sg_uf text,
  cd_municipio text,
  nm_municipio text,
  nr_zona text,
  ds_tipo_mesario text,
  ds_atividade_eleitoral text,
  cd_genero text,
  ds_genero text,
  cd_estado_civil text,
  ds_estado_civil text,
  cd_faixa_etaria text,
  ds_faixa_etaria text,
  cd_grau_instrucao text,
  ds_grau_instrucao text,
  cd_cor_raca text,
  ds_cor_raca text,
  cd_quilombola text,
  ds_quilombola text,
  cd_interprete_libras text,
  ds_interprete_libras text,
  cd_identidade_genero text,
  ds_identidade_genero text,
  st_voluntario text,
  st_comparecimento text,
  qt_convocados_perfil text
);
ALTER TABLE bd_eleicoes_mesarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica mesarios" ON bd_eleicoes_mesarios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia mesarios" ON bd_eleicoes_mesarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- perfil_eleitor_secao (31 colunas)
DROP TABLE IF EXISTS bd_eleicoes_perfil_eleitor_secao CASCADE;
CREATE TABLE bd_eleicoes_perfil_eleitor_secao (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  sg_uf text,
  cd_municipio text,
  nm_municipio text,
  nr_zona text,
  nr_secao text,
  nr_local_votacao text,
  nm_local_votacao text,
  cd_genero text,
  ds_genero text,
  cd_estado_civil text,
  ds_estado_civil text,
  cd_faixa_etaria text,
  ds_faixa_etaria text,
  cd_grau_escolaridade text,
  ds_grau_escolaridade text,
  cd_raca_cor text,
  ds_raca_cor text,
  cd_identidade_genero text,
  ds_identidade_genero text,
  cd_quilombola text,
  ds_quilombola text,
  cd_interprete_libras text,
  ds_interprete_libras text,
  tp_obrigatoriedade_voto text,
  qt_eleitores_perfil text,
  qt_eleitores_biometria text,
  qt_eleitores_deficiencia text,
  qt_eleitores_inc_nm_social text
);
ALTER TABLE bd_eleicoes_perfil_eleitor_secao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica perfil_eleitor_secao" ON bd_eleicoes_perfil_eleitor_secao FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia perfil_eleitor_secao" ON bd_eleicoes_perfil_eleitor_secao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- perfil_eleitorado (21 colunas)
DROP TABLE IF EXISTS bd_eleicoes_perfil_eleitorado CASCADE;
CREATE TABLE bd_eleicoes_perfil_eleitorado (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  sg_uf text,
  cd_municipio text,
  nm_municipio text,
  cd_mun_sit_biometrica text,
  ds_mun_sit_biometrica text,
  nr_zona text,
  cd_genero text,
  ds_genero text,
  cd_estado_civil text,
  ds_estado_civil text,
  cd_faixa_etaria text,
  ds_faixa_etaria text,
  cd_grau_escolaridade text,
  ds_grau_escolaridade text,
  qt_eleitores_perfil text,
  qt_eleitores_biometria text,
  qt_eleitores_deficiencia text,
  qt_eleitores_inc_nm_social text
);
ALTER TABLE bd_eleicoes_perfil_eleitorado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica perfil_eleitorado" ON bd_eleicoes_perfil_eleitorado FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia perfil_eleitorado" ON bd_eleicoes_perfil_eleitorado FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pesquisas (25 colunas)
DROP TABLE IF EXISTS bd_eleicoes_pesquisas CASCADE;
CREATE TABLE bd_eleicoes_pesquisas (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  aa_eleicao text,
  cd_eleicao text,
  nm_eleicao text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  nr_protocolo_registro text,
  dt_registro text,
  st_pesquisa_propria text,
  nr_cnpj_empresa text,
  nm_empresa text,
  nm_empresa_fantasia text,
  ds_cargo text,
  dt_inicio_pesquisa text,
  dt_fim_pesquisa text,
  qt_entrevistado text,
  cd_conre text,
  nm_estatistico_resp text,
  vr_pesquisa text,
  ds_metodologia_pesquisa text,
  ds_plano_amostral text,
  ds_sistema_controle text,
  ds_dado_municipio text
);
ALTER TABLE bd_eleicoes_pesquisas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica pesquisas" ON bd_eleicoes_pesquisas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia pesquisas" ON bd_eleicoes_pesquisas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- receitas (32 colunas)
DROP TABLE IF EXISTS bd_eleicoes_receitas CASCADE;
CREATE TABLE bd_eleicoes_receitas (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  cod_eleicao text,
  desc_eleicao text,
  data_e_hora text,
  cnpj_prestador_conta text,
  sequencial_candidato text,
  uf text,
  sigla_partido text,
  numero_candidato text,
  cargo text,
  nome_candidato text,
  cpf_do_candidato text,
  numero_recibo_eleitoral text,
  numero_do_documento text,
  cpf_cnpj_do_doador text,
  nome_do_doador text,
  nome_do_doador_receita_federal text,
  sigla_ue_doador text,
  numero_partido_doador text,
  numero_candidato_doador text,
  cod_setor_economico_do_doador text,
  setor_economico_do_doador text,
  data_da_receita text,
  valor_receita text,
  tipo_receita text,
  fonte_recurso text,
  especie_recurso text,
  descricao_da_receita text,
  cpf_cnpj_do_doador_originario text,
  nome_do_doador_originario text,
  tipo_doador_originario text,
  setor_economico_do_doador_originario text,
  nome_do_doador_originario_receita_federal text
);
ALTER TABLE bd_eleicoes_receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica receitas" ON bd_eleicoes_receitas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia receitas" ON bd_eleicoes_receitas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- redes_sociais (11 colunas)
DROP TABLE IF EXISTS bd_eleicoes_redes_sociais CASCADE;
CREATE TABLE bd_eleicoes_redes_sociais (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  aa_eleicao text,
  sg_uf text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  cd_eleicao text,
  ds_eleicao text,
  sq_candidato text,
  nr_ordem_rede_social text,
  ds_url text
);
ALTER TABLE bd_eleicoes_redes_sociais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica redes_sociais" ON bd_eleicoes_redes_sociais FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia redes_sociais" ON bd_eleicoes_redes_sociais FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- vagas (15 colunas)
DROP TABLE IF EXISTS bd_eleicoes_vagas CASCADE;
CREATE TABLE bd_eleicoes_vagas (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  dt_posse text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  cd_cargo text,
  ds_cargo text,
  qt_vaga text
);
ALTER TABLE bd_eleicoes_vagas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica vagas" ON bd_eleicoes_vagas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia vagas" ON bd_eleicoes_vagas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- bens_candidatos (19 colunas)
DROP TABLE IF EXISTS bd_eleicoes_bens_candidatos CASCADE;
CREATE TABLE bd_eleicoes_bens_candidatos (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  sq_candidato text,
  nr_ordem_bem_candidato text,
  cd_tipo_bem_candidato text,
  ds_tipo_bem_candidato text,
  ds_bem_candidato text,
  vr_bem_candidato text,
  dt_ult_atual_bem_candidato text,
  hh_ult_atual_bem_candidato text
);
ALTER TABLE bd_eleicoes_bens_candidatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica bens_candidatos" ON bd_eleicoes_bens_candidatos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia bens_candidatos" ON bd_eleicoes_bens_candidatos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- votacao (38 colunas)
DROP TABLE IF EXISTS bd_eleicoes_votacao CASCADE;
CREATE TABLE bd_eleicoes_votacao (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  nr_turno text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  tp_abrangencia text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  cd_municipio text,
  nm_municipio text,
  nr_zona text,
  cd_cargo text,
  ds_cargo text,
  sq_candidato text,
  nr_candidato text,
  nm_candidato text,
  nm_urna_candidato text,
  nm_social_candidato text,
  cd_situacao_candidatura text,
  ds_situacao_candidatura text,
  cd_detalhe_situacao_cand text,
  ds_detalhe_situacao_cand text,
  tp_agremiacao text,
  nr_partido text,
  sg_partido text,
  nm_partido text,
  sq_coligacao text,
  nm_coligacao text,
  ds_composicao_coligacao text,
  cd_sit_tot_turno text,
  ds_sit_tot_turno text,
  st_voto_em_transito text,
  qt_votos_nominais text
);
ALTER TABLE bd_eleicoes_votacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica votacao" ON bd_eleicoes_votacao FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia votacao" ON bd_eleicoes_votacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- votacao_partido (28 colunas)
DROP TABLE IF EXISTS bd_eleicoes_votacao_partido CASCADE;
CREATE TABLE bd_eleicoes_votacao_partido (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  nr_turno text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  tp_abrangencia text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  cd_municipio text,
  nm_municipio text,
  nr_zona text,
  cd_cargo text,
  ds_cargo text,
  tp_agremiacao text,
  nr_partido text,
  sg_partido text,
  nm_partido text,
  sq_coligacao text,
  nm_coligacao text,
  ds_composicao_coligacao text,
  st_voto_em_transito text,
  qt_votos_nominais text,
  qt_votos_legenda text
);
ALTER TABLE bd_eleicoes_votacao_partido ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica votacao_partido" ON bd_eleicoes_votacao_partido FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia votacao_partido" ON bd_eleicoes_votacao_partido FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- votacao_secao (28 colunas)
DROP TABLE IF EXISTS bd_eleicoes_votacao_secao CASCADE;
CREATE TABLE bd_eleicoes_votacao_secao (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  dt_geracao text,
  hh_geracao text,
  ano_eleicao text,
  cd_tipo_eleicao text,
  nm_tipo_eleicao text,
  nr_turno text,
  cd_eleicao text,
  ds_eleicao text,
  dt_eleicao text,
  tp_abrangencia text,
  sg_uf text,
  sg_ue text,
  nm_ue text,
  cd_municipio text,
  nm_municipio text,
  nr_zona text,
  nr_secao text,
  cd_cargo text,
  ds_cargo text,
  qt_aptos text,
  qt_comparecimento text,
  qt_abstencoes text,
  qt_votos_nominais text,
  qt_votos_brancos text,
  qt_votos_nulos text,
  qt_votos_legenda text,
  qt_votos_anulados_apu_sep text,
  nr_local_votacao text
);
ALTER TABLE bd_eleicoes_votacao_secao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica votacao_secao" ON bd_eleicoes_votacao_secao FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin gerencia votacao_secao" ON bd_eleicoes_votacao_secao FOR ALL TO authenticated USING (true) WITH CHECK (true);

"""

def limpar_valor(val):
    """Limpa valores nulos do TSE"""
    if val in ('#NULO#', '#NE#', '#NULO', '', 'null', 'NULL'):
        return None
    return val

def main():
    global DB_URL
    
    if not DB_URL:
        DB_URL = input("\nCole a CONNECTION STRING do Supabase (URI):\n> ").strip()
    
    if not DB_URL:
        print("ERRO: Connection string vazia!")
        sys.exit(1)
    
    print(f"\n{'='*60}")
    print("UPLOAD ELEICOES GO - 21 TABELAS")
    print(f"{'='*60}")
    print(f"Pasta: {PASTA}")
    print(f"Banco: {DB_URL[:50]}...")
    
    # Conectar
    print("\nConectando ao banco...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = False
        cur = conn.cursor()
        print("OK - Conectado!")
    except Exception as e:
        print(f"ERRO de conexao: {e}")
        sys.exit(1)
    
    # Criar tabelas
    print("\nCriando/recriando 21 tabelas...")
    try:
        sql = get_create_sql()
        cur.execute(sql)
        conn.commit()
        print("OK - Todas as tabelas criadas!")
    except Exception as e:
        conn.rollback()
        print(f"ERRO ao criar tabelas: {e}")
        sys.exit(1)
    
    # Upload dos dados
    total_geral = 0
    erros = []
    inicio_geral = time.time()
    
    for i, (tabela, esperado) in enumerate(ORDEM, 1):
        arquivo = os.path.join(PASTA, f"bd_eleicoes_{tabela}.csv")
        nome_tabela = f"bd_eleicoes_{tabela}"
        colunas = COLUNAS[tabela]
        
        if not os.path.exists(arquivo):
            print(f"  [{i}/21] SKIP {tabela} - arquivo nao encontrado")
            erros.append(tabela)
            continue
        
        print(f"  [{i}/21] {tabela} ({esperado:,} registros)...", end=" ", flush=True)
        inicio = time.time()
        
        try:
            # Truncar
            cur.execute(f"TRUNCATE {nome_tabela} RESTART IDENTITY")
            conn.commit()
            
            # COPY FROM usando arquivo
            cols_sql = ", ".join(colunas)
            
            # Ler arquivo, pular header, e fazer COPY
            with open(arquivo, 'r', encoding='utf-8') as f:
                header = f.readline()  # pula header
                
                copy_sql = f"COPY {nome_tabela} ({cols_sql}) FROM STDIN WITH (FORMAT csv, DELIMITER ';', QUOTE '\"\', NULL '#NULO#')"
                cur.copy_expert(copy_sql, f)
            
            conn.commit()
            
            # Verificar contagem
            cur.execute(f"SELECT count(*) FROM {nome_tabela}")
            count = cur.fetchone()[0]
            
            duracao = time.time() - inicio
            velocidade = int(count / duracao) if duracao > 0 else 0
            
            if count >= esperado * 0.99:
                print(f"OK {count:,} em {duracao:.0f}s ({velocidade:,}/s)")
                total_geral += count
            else:
                print(f"PARCIAL {count:,}/{esperado:,} em {duracao:.0f}s")
                total_geral += count
                
        except Exception as e:
            conn.rollback()
            print(f"ERRO: {e}")
            erros.append(tabela)
    
    duracao_total = time.time() - inicio_geral
    
    print(f"\n{'='*60}")
    print(f"RESULTADO FINAL")
    print(f"{'='*60}")
    print(f"Total registros: {total_geral:,}")
    print(f"Duracao total: {duracao_total/60:.1f} minutos")
    print(f"Tabelas com erro: {len(erros)}")
    if erros:
        print(f"  Erros em: {', '.join(erros)}")
    print(f"\nTabelas OK: {21 - len(erros)}/21")
    
    cur.close()
    conn.close()
    print("\nConexao fechada. Upload concluido!")

if __name__ == "__main__":
    main()
