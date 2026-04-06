import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const token = Deno.env.get('MOTHERDUCK_TOKEN')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'MOTHERDUCK_TOKEN não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const sql = body?.query

    if (!sql || typeof sql !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Campo "query" (string SQL) é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Safety: only allow SELECT statements
    const trimmed = sql.trim().toUpperCase()
    if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('DESCRIBE') && !trimmed.startsWith('SHOW') && !trimmed.startsWith('WITH')) {
      return new Response(
        JSON.stringify({ error: 'Apenas queries SELECT/WITH/DESCRIBE/SHOW são permitidas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mdResponse = await fetch('https://api.motherduck.com/v1/queries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    })

    const mdData = await mdResponse.json()

    if (!mdResponse.ok) {
      console.error('MotherDuck error:', mdData)
      return new Response(
        JSON.stringify({ error: 'Erro no MotherDuck', details: mdData }),
        { status: mdResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(mdData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('query-motherduck error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
