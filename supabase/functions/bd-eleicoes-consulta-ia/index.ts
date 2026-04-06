const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MotherDuck schema for AI context
const TABELAS_SCHEMA = `
Tabelas disponíveis no MotherDuck (banco my_db). Cada tabela tem sufixo _YYYY_GO (ex: candidatos_2024_GO).
Anos disponíveis para candidatos: 2012, 2014, 2016, 2018, 2020, 2022, 2024
Anos para bens: 2014, 2016, 2018, 2020, 2022, 2024
Anos para votação/comparecimento: 2012-2024

1. my_db.candidatos_YYYY_GO: candidatos eleitorais de Goiás
   Colunas: ano_eleicao, nr_turno, nm_candidato, nm_urna_candidato, sg_partido, nm_partido,
   ds_cargo, nm_ue (município), ds_genero, ds_grau_instrucao, ds_ocupacao,
   ds_sit_tot_turno (situação final), sq_candidato, nr_candidato, nr_cpf_candidato,
   dt_nascimento, ds_nacionalidade, ds_cor_raca, ds_estado_civil, nr_idade_data_posse

2. my_db.bens_candidatos_YYYY_GO: bens declarados
   Colunas: sq_candidato, ds_tipo_bem_candidato, ds_bem_candidato, vr_bem_candidato (VARCHAR! use CAST para somar),
   nr_ordem_bem_candidato, ano_eleicao, sg_partido

3. my_db.votacao_munzona_YYYY_GO: votos por candidato/zona
   Colunas: ano_eleicao, nr_turno, nm_municipio, nr_zona, ds_cargo, nm_urna_candidato,
   sg_partido, nr_candidato, qt_votos_nominais

4. my_db.comparecimento_munzona_YYYY_GO: comparecimento por zona
   Colunas: ano_eleicao, nr_turno, nm_municipio, nr_zona, qt_aptos, qt_comparecimento,
   qt_abstencoes, qt_votos_brancos, qt_votos_nulos

5. my_db.comparecimento_abstencao_YYYY_GO: comparecimento por seção/bairro
   Colunas: ano_eleicao, nr_turno, nm_municipio, nr_zona, nr_secao, nm_local_votacao,
   nm_bairro, ds_endereco, qt_aptos, qt_comparecimento, qt_abstencoes

6. my_db.perfil_eleitorado_YYYY_GO: perfil do eleitorado
   Colunas: nm_municipio, ds_genero, ds_faixa_etaria, ds_grau_escolaridade, qt_eleitores_perfil

7. my_db.votacao_partido_munzona_YYYY_GO: votos por partido
   Colunas: nm_municipio, nr_zona, sg_partido, ds_cargo, qt_votos_nominais, qt_votos_legenda

Contexto: Dados eleitorais do estado de Goiás (GO), Brasil.
Principais municípios: GOIÂNIA, APARECIDA DE GOIÂNIA, ANÁPOLIS.
REGRAS:
- Sempre especifique o ano na tabela (ex: my_db.candidatos_2024_GO)
- Para múltiplos anos, use UNION ALL
- vr_bem_candidato é VARCHAR, use CAST(vr_bem_candidato AS DOUBLE) para somas
- NUNCA pesquise dados fora deste schema
- Responda APENAS com dados que existem nestas tabelas
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pergunta } = await req.json();
    if (!pergunta || typeof pergunta !== "string" || pergunta.length < 3) {
      return new Response(JSON.stringify({ erro: "Pergunta inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ erro: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Use AI Gateway to generate SQL
    const aiRes = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um analista de dados eleitorais especialista em Goiás. Gere queries SQL para o MotherDuck (DuckDB).
REGRAS CRÍTICAS:
- Use APENAS as tabelas descritas abaixo. NUNCA invente tabelas ou colunas.
- NUNCA pesquise na internet ou invente dados. Responda APENAS com base nos dados disponíveis.
- Gere APENAS SELECT, nunca INSERT/UPDATE/DELETE
- Use LIMIT máximo de 200
- Se o usuário perguntar algo fora do escopo eleitoral de Goiás, diga que não tem dados para isso.
- Escolha o tipo de gráfico mais adequado: bar, pie, line, area, table, kpi
- Para KPIs, retorne uma única linha com valores numéricos
- Sempre ordene os resultados de forma relevante
- Responda APENAS em JSON válido com esta estrutura:
{"sql": "SELECT ...", "tipo_grafico": "bar|pie|line|area|table|kpi", "titulo": "...", "descricao": "..."}

${TABELAS_SCHEMA}`,
          },
          { role: "user", content: pergunta },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI Gateway error:", aiRes.status, errText);
      return new Response(JSON.stringify({ erro: "Erro ao consultar IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawText = aiData?.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ erro: "IA não retornou formato válido", raw: rawText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const { sql, tipo_grafico, titulo, descricao } = parsed;

    // Safety check
    const sqlUpper = sql.toUpperCase().trim();
    if (!sqlUpper.startsWith("SELECT") && !sqlUpper.startsWith("WITH")) {
      return new Response(JSON.stringify({ erro: "Query não permitida por segurança" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const forbidden = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "TRUNCATE", "CREATE"];
    if (forbidden.some(f => sqlUpper.includes(f))) {
      return new Response(JSON.stringify({ erro: "Query contém operação proibida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Execute SQL via MotherDuck
    const mdToken = Deno.env.get("MOTHERDUCK_TOKEN");
    if (!mdToken) {
      return new Response(JSON.stringify({ erro: "MOTHERDUCK_TOKEN não configurado", sql_gerado: sql }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
    const pg = postgres({
      hostname: "pg.us-east-1-aws.motherduck.com",
      port: 5432,
      username: "postgres",
      password: mdToken,
      database: "md:",
      ssl: "require",
      connection: { application_name: "eleicoesgo-consulta-ia" },
      max: 1,
      idle_timeout: 5,
      connect_timeout: 15,
    });

    try {
      const rows = await pg.unsafe(sql);
      await pg.end();

      const dados = Array.isArray(rows) ? rows.map((r: any) => ({ ...r })) : [];
      const colunas = dados.length > 0 ? Object.keys(dados[0]) : [];

      return new Response(JSON.stringify({
        sucesso: true,
        tipo_grafico: tipo_grafico || "table",
        titulo: titulo || "Resultado",
        descricao: descricao || "",
        colunas,
        dados,
        sql_gerado: sql,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (queryErr: any) {
      await pg.end().catch(() => {});
      console.error("Query error:", queryErr.message);
      return new Response(JSON.stringify({
        sucesso: false,
        erro: `Erro na query: ${queryErr.message}`,
        sql_gerado: sql,
        tipo_grafico: tipo_grafico || "table",
        titulo: titulo || "Erro",
        descricao: descricao || "",
        colunas: [],
        dados: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ erro: e.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
