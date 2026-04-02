import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!

    // Use pg to run raw SQL
    const { Pool } = await import('https://deno.land/x/postgres@v0.19.3/mod.ts')
    const pool = new Pool(dbUrl, 1)
    const conn = await pool.connect()

    try {
      await conn.queryArray(`
        CREATE TABLE IF NOT EXISTS bd_eleicoes_candidatos (
          id bigint generated always as identity primary key,
          ano int NOT NULL,
          turno int,
          cargo text,
          nome_urna text,
          nome_completo text,
          numero_urna int,
          partido text,
          municipio text,
          codigo_municipio text,
          situacao_final text,
          foto_url text,
          created_at timestamp default now()
        );

        CREATE TABLE IF NOT EXISTS bd_eleicoes_votacao (
          id bigint generated always as identity primary key,
          ano int NOT NULL,
          turno int,
          cargo text,
          municipio text,
          codigo_municipio text,
          zona int,
          nome_candidato text,
          numero_urna int,
          partido text,
          total_votos int,
          created_at timestamp default now()
        );

        CREATE TABLE IF NOT EXISTS bd_eleicoes_comparecimento (
          id bigint generated always as identity primary key,
          ano int NOT NULL,
          turno int,
          municipio text,
          codigo_municipio text,
          eleitorado_apto int,
          comparecimento int,
          abstencoes int,
          created_at timestamp default now()
        );

        CREATE TABLE IF NOT EXISTS bd_eleicoes_importacoes_log (
          id bigint generated always as identity primary key,
          ano int,
          tipo text,
          status text,
          total_registros int,
          registros_inseridos int,
          erro text,
          iniciado_em timestamp default now(),
          finalizado_em timestamp,
          created_at timestamp default now()
        );

        CREATE INDEX IF NOT EXISTS idx_bd_eleicoes_votacao_ano_cargo ON bd_eleicoes_votacao (ano, cargo);
        CREATE INDEX IF NOT EXISTS idx_bd_eleicoes_votacao_municipio ON bd_eleicoes_votacao (municipio);
        CREATE INDEX IF NOT EXISTS idx_bd_eleicoes_votacao_nome ON bd_eleicoes_votacao (nome_candidato);
        CREATE INDEX IF NOT EXISTS idx_bd_eleicoes_votacao_partido ON bd_eleicoes_votacao (partido);
        CREATE INDEX IF NOT EXISTS idx_bd_eleicoes_candidatos_ano ON bd_eleicoes_candidatos (ano, cargo, partido);
        CREATE INDEX IF NOT EXISTS idx_bd_eleicoes_candidatos_nome ON bd_eleicoes_candidatos (nome_urna);
        CREATE INDEX IF NOT EXISTS idx_bd_eleicoes_comparecimento_ano ON bd_eleicoes_comparecimento (ano, municipio);

        ALTER TABLE bd_eleicoes_candidatos ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bd_eleicoes_votacao ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bd_eleicoes_comparecimento ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bd_eleicoes_importacoes_log ENABLE ROW LEVEL SECURITY;

        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leitura publica candidatos') THEN
            CREATE POLICY "Leitura publica candidatos" ON bd_eleicoes_candidatos FOR SELECT TO anon, authenticated USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin gerencia candidatos') THEN
            CREATE POLICY "Admin gerencia candidatos" ON bd_eleicoes_candidatos FOR ALL TO authenticated USING (true) WITH CHECK (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leitura publica votacao') THEN
            CREATE POLICY "Leitura publica votacao" ON bd_eleicoes_votacao FOR SELECT TO anon, authenticated USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin gerencia votacao') THEN
            CREATE POLICY "Admin gerencia votacao" ON bd_eleicoes_votacao FOR ALL TO authenticated USING (true) WITH CHECK (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leitura publica comparecimento') THEN
            CREATE POLICY "Leitura publica comparecimento" ON bd_eleicoes_comparecimento FOR SELECT TO anon, authenticated USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin gerencia comparecimento') THEN
            CREATE POLICY "Admin gerencia comparecimento" ON bd_eleicoes_comparecimento FOR ALL TO authenticated USING (true) WITH CHECK (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leitura publica log') THEN
            CREATE POLICY "Leitura publica log" ON bd_eleicoes_importacoes_log FOR SELECT TO anon, authenticated USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin gerencia log') THEN
            CREATE POLICY "Admin gerencia log" ON bd_eleicoes_importacoes_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `)

      return new Response(JSON.stringify({ success: true, message: 'Tabelas criadas com sucesso' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } finally {
      conn.release()
      await pool.end()
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
