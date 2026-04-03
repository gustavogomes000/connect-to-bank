

# Plano: Inventario Completo de Dados — Goias + Aparecida de Goiania

## O que ja temos no banco (tabelas existentes)

| Tabela | Conteudo | Anos |
|--------|----------|------|
| `bd_eleicoes_candidatos` | Candidatos GO (nome, partido, cargo, foto, genero, instrucao, ocupacao) | 2014-2024 |
| `bd_eleicoes_votacao` | Votos por candidato/munzona | 2014-2024 |
| `bd_eleicoes_votacao_partido` | Votos por partido/munzona | 2014-2024 |
| `bd_eleicoes_comparecimento` | Comparecimento/abstencao por munzona | 2014-2024 |
| `bd_eleicoes_comparecimento_secao` | Comparecimento por secao (com bairro, local) | 2014-2024 |
| `bd_eleicoes_locais_votacao` | Locais/colegios eleitorais (endereco, bairro) | 2014-2024 |
| `bd_eleicoes_bens_candidatos` | Patrimonio declarado dos candidatos | 2014-2024 |
| `bd_eleicoes_importacoes_log` | Log de importacoes | — |

## O que FALTA adicionar

### BLOCO 1 — Dados TSE (fontes confirmadas, ZIP/CSV do cdn.tse.jus.br)

| # | Dado | URL TSE | Tabela nova | O que ganha |
|---|------|---------|-------------|-------------|
| 1 | **Perfil do Eleitorado** | `perfil_eleitorado/perfil_eleitorado_{ano}.zip` | `bd_eleicoes_perfil_eleitorado` | Faixa etaria, genero, escolaridade, estado civil dos eleitores por municipio/zona/secao em GO |
| 2 | **Perfil Eleitor por Secao** | `perfil_eleitor_secao/perfil_eleitor_secao_{ano}.zip` | `bd_eleicoes_perfil_eleitor_secao` | Granularidade maxima: quantos eleitores homens/mulheres/jovens/idosos em cada secao de Aparecida |
| 3 | **Eleitorado Local Votacao** | `perfil_eleitorado/eleitorado_local_votacao_ATUAL.zip` | `bd_eleicoes_eleitorado_local` | Mapa atual de quantos eleitores por colegio/secao/zona — essencial para Aparecida |
| 4 | **Prestacao de Contas** | `prestacao_contas/prestacao_de_contas_eleitorais_candidatos_{ano}.zip` | `bd_eleicoes_prestacao_contas` | Receitas e despesas de campanha: quem financiou, quanto gastou, custo por voto |
| 5 | **Coligacoes/Legendas** | `consulta_legendas/consulta_legendas_{ano}.zip` | `bd_eleicoes_coligacoes` | Quais partidos se coligaram em cada eleicao em GO |
| 6 | **Filiados por Partido** | `filiados/filiados_{sigla_partido}.zip` | `bd_eleicoes_filiados` | Quantos filiados cada partido tem em cada municipio de GO — forca real do partido |
| 7 | **Redes Sociais Candidatos** | `rede_social_candidato/rede_social_candidato_{ano}.zip` (2022+) | `bd_eleicoes_redes_sociais` | Instagram, Facebook, site de cada candidato |
| 8 | **Motivo Cassacao** | `motivo_cassacao/motivo_cassacao_{ano}.zip` | `bd_eleicoes_cassacoes` | Candidatos cassados e motivos — ficha limpa |
| 9 | **Vagas por Cargo** | `consulta_vagas/consulta_vagas_{ano}.zip` | `bd_eleicoes_vagas` | Quantas vagas por cargo/municipio — calcula competitividade |
| 10 | **Votacao por Secao** (tabela falta) | `votacao_secao/votacao_secao_{ano}_GO.zip` | `bd_eleicoes_votacao_secao` | Votos de cada candidato em cada secao — mapa bairro a bairro |

### BLOCO 2 — Dados IBGE (download CSV/JSON gravados no banco, SEM API em runtime)

| # | Dado | Fonte | Tabela nova | O que ganha |
|---|------|-------|-------------|-------------|
| 11 | **Populacao Municipios GO** | IBGE Cidades (CSV estimativas) | `bd_eleicoes_ibge_populacao` | Populacao por municipio/ano — calcula votos per capita |
| 12 | **PIB Municipal** | IBGE PIB Municipios | `bd_eleicoes_ibge_pib` | PIB per capita por municipio — correlacao renda x voto |
| 13 | **Censo 2022 Aparecida** | IBGE Censo 2022 setores | `bd_eleicoes_ibge_censo` | Dados demograficos detalhados: renda, idade, escolaridade por setor censitario de Aparecida |
| 14 | **Malha de Bairros Aparecida** | IBGE + Prefeitura | `bd_eleicoes_bairros_aparecida` | Mapeamento zona/secao → bairro de Aparecida para analise geografica |

### BLOCO 3 — Dados Especificos Aparecida de Goiania

| # | Dado | Fonte | Tabela nova | O que ganha |
|---|------|-------|-------------|-------------|
| 15 | **Historico Candidatos Aparecida** | Cruzamento bd_eleicoes_candidatos + votacao | `bd_eleicoes_historico_candidato` | View/tabela materializada: trajetoria completa de cada candidato que ja concorreu em Aparecida |
| 16 | **Mapa Zona-Secao-Colegio** | Cruzamento locais_votacao + comparecimento_secao | (view) | Qual colegio, quantos aptos, quantos votaram, % comparecimento por colegio |

## Resumo de novas tabelas (14 tabelas)

```text
TABELAS NOVAS A CRIAR:
─────────────────────────────────────────
bd_eleicoes_perfil_eleitorado
bd_eleicoes_perfil_eleitor_secao
bd_eleicoes_eleitorado_local
bd_eleicoes_prestacao_contas
bd_eleicoes_coligacoes
bd_eleicoes_filiados
bd_eleicoes_redes_sociais
bd_eleicoes_cassacoes
bd_eleicoes_vagas
bd_eleicoes_votacao_secao  (se nao existir ainda)
bd_eleicoes_ibge_populacao
bd_eleicoes_ibge_pib
bd_eleicoes_ibge_censo
bd_eleicoes_bairros_aparecida
```

## Etapas de implementacao

### Etapa 1 — Criar todas as tabelas com migrations SQL
- 14 tabelas novas com colunas mapeadas dos CSVs do TSE
- RLS: leitura publica, escrita para authenticated
- Indices em (ano, codigo_municipio) para performance

### Etapa 2 — Criar edge functions de importacao
- Uma edge function por tipo de dado (seguindo o padrao existente)
- Filtro SG_UF = 'GO' em todos
- Batch insert de 500 registros

### Etapa 3 — Atualizar pagina ImportarDados.tsx
- Adicionar os novos tipos na grade de importacao
- Botao "Importar Tudo" atualizado

### Etapa 4 — Script Python para IBGE
- Download dos CSVs do IBGE
- Parse e insert direto no Supabase via API
- Executar localmente na sua maquina

### Etapa 5 — Views materializadas para Aparecida
- Historico completo por candidato
- Mapa colegio → bairro → zona com totais

## Dados que NAO vamos incluir (conforme pedido)
- Comparacao nacional (outros estados)
- Dados em tempo real via API (tudo gravado no banco)

