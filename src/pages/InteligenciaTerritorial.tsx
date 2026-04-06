import { useState, useMemo } from 'react';
import { formatNumber, formatPercent, formatBRL, formatBRLCompact, getPartidoCor, ANOS_DISPONIVEIS, CARGOS_DISPONIVEIS } from '@/lib/eleicoes';
import {
  useCidadeKPIs, useTopVotadosCidade, useVotacaoZonaCidade,
  useBairrosCidade, useLocaisCidade, useVotosCandidatoZona,
  useComparativoCidades, useCandidatosCidadePatrimonio, usePartidosCidade,
} from '@/hooks/useInteligenciaTerritorial';
import { KPISkeleton, TableSkeleton } from '@/components/eleicoes/Skeletons';
import { Pagination } from '@/components/eleicoes/Pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { MapPin, School, Users, Trophy, Search, ArrowUpDown, TrendingUp, Vote, Building2, Target, ChevronRight } from 'lucide-react';

const CIDADES = ['GOIÂNIA', 'APARECIDA DE GOIÂNIA'] as const;

function KPICard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon?: any }) {
  return (
    <div className="bg-card rounded-xl border p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="w-4 h-4" />}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default function InteligenciaTerritorial() {
  const [cidade, setCidade] = useState<string>(CIDADES[0]);
  const [ano, setAno] = useState<number | null>(2024);
  const [cargo, setCargo] = useState<string | null>(null);
  const [bairroSelecionado, setBairroSelecionado] = useState<string | null>(null);
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<string | null>(null);
  const [searchCandidato, setSearchCandidato] = useState('');
  const [tab, setTab] = useState('visao-geral');

  // Paginação
  const [bairroPage, setBairroPage] = useState(0);
  const [bairroPageSize, setBairroPageSize] = useState(20);
  const [localPage, setLocalPage] = useState(0);
  const [localPageSize, setLocalPageSize] = useState(20);
  const [candPage, setCandPage] = useState(0);
  const [candPageSize, setCandPageSize] = useState(20);

  const { data: kpis, isLoading: loadKPIs } = useCidadeKPIs(cidade, ano);
  const { data: topVotados, isLoading: loadTop } = useTopVotadosCidade(cidade, ano, cargo);
  const { data: zonas, isLoading: loadZonas } = useVotacaoZonaCidade(cidade, ano);
  const { data: bairros, isLoading: loadBairros } = useBairrosCidade(cidade, ano);
  const { data: locais, isLoading: loadLocais } = useLocaisCidade(cidade, ano, bairroSelecionado);
  const { data: votosCandZona } = useVotosCandidatoZona(cidade, ano, candidatoSelecionado);
  const { data: comparativo } = useComparativoCidades(ano);
  const { data: candidatosPatri } = useCandidatosCidadePatrimonio(cidade, ano);
  const { data: partidosCidade } = usePartidosCidade(cidade, ano);

  const filteredTop = useMemo(() => {
    if (!topVotados) return [];
    let list = topVotados;
    if (searchCandidato) list = list.filter((c: any) => c.nome.toLowerCase().includes(searchCandidato.toLowerCase()));
    return list;
  }, [topVotados, searchCandidato]);

  const topChart = (filteredTop || []).slice(0, 15).map((c: any) => ({
    nome: c.nome?.length > 18 ? c.nome.slice(0, 16) + '…' : c.nome,
    votos: c.votos,
    partido: c.partido,
  }));

  const zonaChart = (zonas || []).map((z: any) => ({
    zona: `Z${z.zona}`,
    eleitorado: z.apto,
    comparecimento: z.comp,
    pctComp: z.apto > 0 ? Math.round((z.comp / z.apto) * 100) : 0,
  }));

  const partidosChart = (partidosCidade || []).slice(0, 10).map((p: any) => ({
    partido: p.partido,
    votos: p.votos,
    candidatos: p.candidatos,
    eleitos: p.eleitos,
    fill: getPartidoCor(p.partido),
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Inteligência Territorial
          </h1>
          <p className="text-sm text-muted-foreground">Análise completa por região, bairro, escola e candidato</p>
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Select value={cidade} onValueChange={v => { setCidade(v); setBairroSelecionado(null); setCandidatoSelecionado(null); setBairroPage(0); }}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CIDADES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ano?.toString() || 'todos'} onValueChange={v => setAno(v === 'todos' ? null : parseInt(v))}>
            <SelectTrigger className="w-[100px] h-9 text-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {ANOS_DISPONIVEIS.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cargo || 'todos'} onValueChange={v => setCargo(v === 'todos' ? null : v)}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos cargos</SelectItem>
              {CARGOS_DISPONIVEIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      {loadKPIs ? <KPISkeleton /> : kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard icon={Users} label="Candidatos" value={formatNumber(kpis.totalCandidatos)} sub={`${kpis.partidos} partidos`} />
          <KPICard icon={Trophy} label="Eleitos" value={formatNumber(kpis.eleitos)} sub={kpis.totalCandidatos > 0 ? formatPercent((kpis.eleitos / kpis.totalCandidatos) * 100) : '-'} />
          <KPICard icon={Users} label="Mulheres" value={formatNumber(kpis.mulheres)} sub={kpis.totalCandidatos > 0 ? formatPercent((kpis.mulheres / kpis.totalCandidatos) * 100) : '-'} />
          <KPICard icon={Vote} label="Eleitorado" value={formatNumber(kpis.totalApto)} />
          <KPICard icon={TrendingUp} label="Comparecimento" value={kpis.totalApto > 0 ? formatPercent((kpis.totalComp / kpis.totalApto) * 100) : '-'} sub={formatNumber(kpis.totalComp) + ' votos'} />
          <KPICard icon={Target} label="Brancos/Nulos" value={formatNumber(kpis.totalBrancos + kpis.totalNulos)} sub={kpis.totalComp > 0 ? formatPercent(((kpis.totalBrancos + kpis.totalNulos) / kpis.totalComp) * 100) : '-'} />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="candidatos" className="text-xs">Candidatos</TabsTrigger>
          <TabsTrigger value="bairros" className="text-xs">Bairros</TabsTrigger>
          <TabsTrigger value="escolas" className="text-xs">Escolas/Locais</TabsTrigger>
          <TabsTrigger value="zonas" className="text-xs">Zonas</TabsTrigger>
          <TabsTrigger value="partidos" className="text-xs">Partidos</TabsTrigger>
          <TabsTrigger value="comparativo" className="text-xs">Goiânia × Aparecida</TabsTrigger>
        </TabsList>

        {/* ════ VISÃO GERAL ════ */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top votados chart */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Top 15 Mais Votados — {cidade}</h3>
              {loadTop ? <TableSkeleton /> : topChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={topChart} layout="vertical" margin={{ left: 100 }}>
                    <XAxis type="number" tickFormatter={(v: number) => formatNumber(v)} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={95} />
                    <Tooltip formatter={(v: number) => formatNumber(v)} />
                    <Bar dataKey="votos" name="Votos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de votação</p>}
            </div>

            {/* Partidos pie */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Distribuição por Partido</h3>
              {partidosChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <PieChart>
                    <Pie data={partidosChart} dataKey="votos" nameKey="partido" cx="50%" cy="50%" outerRadius={120} label={({ partido, percent }: any) => `${partido} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }} fontSize={10}>
                      {partidosChart.map((p: any, i: number) => <Cell key={i} fill={p.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatNumber(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>}
            </div>
          </div>

          {/* Zona chart */}
          {zonaChart.length > 0 && (
            <div className="bg-card rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Comparecimento por Zona Eleitoral</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={zonaChart}>
                  <XAxis dataKey="zona" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v: number) => formatNumber(v)} />
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="eleitorado" name="Eleitorado" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comparecimento" name="Comparecimento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TabsContent>

        {/* ════ CANDIDATOS ════ */}
        <TabsContent value="candidatos" className="space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchCandidato} onChange={e => { setSearchCandidato(e.target.value); setCandPage(0); }} placeholder="Buscar candidato..." className="pl-9 h-9" />
            </div>
          </div>

          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="p-4 pb-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Candidato</th>
                    <th className="pb-2 font-medium">Partido</th>
                    <th className="pb-2 font-medium">Cargo</th>
                    <th className="pb-2 font-medium text-right">Votos</th>
                    <th className="pb-2 font-medium text-right">Patrimônio</th>
                    <th className="pb-2 font-medium text-right">Situação</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {(candidatosPatri || [])
                    .filter((c: any) => !searchCandidato || c.nome_urna?.toLowerCase().includes(searchCandidato.toLowerCase()))
                    .slice(candPage * candPageSize, (candPage + 1) * candPageSize)
                    .map((c: any, i: number) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 font-medium">{c.nome_urna}</td>
                        <td className="py-2"><Badge variant="outline" style={{ borderColor: getPartidoCor(c.sigla_partido) }}>{c.sigla_partido}</Badge></td>
                        <td className="py-2 text-muted-foreground text-xs">{c.cargo}</td>
                        <td className="py-2 text-right font-semibold">{formatNumber(c.votos)}</td>
                        <td className="py-2 text-right text-xs">{c.patrimonio > 0 ? formatBRLCompact(c.patrimonio) : '-'}</td>
                        <td className="py-2 text-right"><Badge variant="secondary" className="text-[10px]">{c.situacao_final || '-'}</Badge></td>
                        <td className="py-2">
                          <button className="text-xs text-primary hover:underline" onClick={() => { setCandidatoSelecionado(c.nome_urna); setTab('zonas'); }}>
                            Zonas →
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {candidatosPatri && candidatosPatri.length > 0 && (
              <Pagination page={candPage} totalItems={candidatosPatri.filter((c: any) => !searchCandidato || c.nome_urna?.toLowerCase().includes(searchCandidato.toLowerCase())).length} pageSize={candPageSize} onPageChange={setCandPage} onPageSizeChange={setCandPageSize} />
            )}
          </div>
        </TabsContent>

        {/* ════ BAIRROS ════ */}
        <TabsContent value="bairros" className="space-y-4">
          {loadBairros ? <TableSkeleton /> : (
            <>
              {/* Bairro chart */}
              {(bairros || []).length > 0 && (
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="text-sm font-semibold mb-3">Eleitorado por Bairro (Top 15)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={(bairros || []).slice(0, 15).map(b => ({ bairro: b.bairro.length > 20 ? b.bairro.slice(0, 18) + '…' : b.bairro, apto: b.apto, comp: b.comp }))} layout="vertical" margin={{ left: 120 }}>
                      <XAxis type="number" tickFormatter={(v: number) => formatNumber(v)} />
                      <YAxis type="category" dataKey="bairro" tick={{ fontSize: 10 }} width={115} />
                      <Tooltip formatter={(v: number) => formatNumber(v)} />
                      <Bar dataKey="apto" name="Eleitorado" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="comp" name="Comparecimento" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="p-4 pb-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Bairro</th>
                        <th className="pb-2 font-medium text-right">Eleitorado</th>
                        <th className="pb-2 font-medium text-right">Comparecimento</th>
                        <th className="pb-2 font-medium text-right">Abstenções</th>
                        <th className="pb-2 font-medium text-right">% Comp.</th>
                        <th className="pb-2 font-medium text-right">Brancos</th>
                        <th className="pb-2 font-medium text-right">Nulos</th>
                        <th className="pb-2 font-medium text-right">Locais</th>
                        <th className="pb-2 font-medium text-right">Seções</th>
                        <th className="pb-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bairros || []).slice(bairroPage * bairroPageSize, (bairroPage + 1) * bairroPageSize).map((b, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 font-medium">{b.bairro}</td>
                          <td className="py-2 text-right">{formatNumber(b.apto)}</td>
                          <td className="py-2 text-right">{formatNumber(b.comp)}</td>
                          <td className="py-2 text-right">{formatNumber(b.abst)}</td>
                          <td className="py-2 text-right font-semibold">{b.apto > 0 ? formatPercent((b.comp / b.apto) * 100) : '-'}</td>
                          <td className="py-2 text-right text-xs text-muted-foreground">{formatNumber(b.brancos)}</td>
                          <td className="py-2 text-right text-xs text-muted-foreground">{formatNumber(b.nulos)}</td>
                          <td className="py-2 text-right">{b.locais}</td>
                          <td className="py-2 text-right">{b.secoes}</td>
                          <td className="py-2">
                            <button className="text-xs text-primary hover:underline flex items-center gap-0.5" onClick={() => { setBairroSelecionado(b.bairro); setLocalPage(0); setTab('escolas'); }}>
                              Locais <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bairros && bairros.length > 0 && (
                  <Pagination page={bairroPage} totalItems={bairros.length} pageSize={bairroPageSize} onPageChange={setBairroPage} onPageSizeChange={setBairroPageSize} />
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ════ ESCOLAS/LOCAIS ════ */}
        <TabsContent value="escolas" className="space-y-4">
          {bairroSelecionado && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Bairro: <span className="font-semibold text-foreground">{bairroSelecionado}</span>
              <button className="ml-2 text-primary text-xs hover:underline" onClick={() => setBairroSelecionado(null)}>limpar filtro</button>
            </div>
          )}
          {loadLocais ? <TableSkeleton /> : (
            <div className="bg-card rounded-xl border overflow-hidden">
              <div className="p-4 pb-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Local de Votação (Escola)</th>
                      <th className="pb-2 font-medium">Bairro</th>
                      <th className="pb-2 font-medium text-right">Zona</th>
                      <th className="pb-2 font-medium text-right">Seções</th>
                      <th className="pb-2 font-medium text-right">Eleitorado</th>
                      <th className="pb-2 font-medium text-right">Comparecimento</th>
                      <th className="pb-2 font-medium text-right">% Comp.</th>
                      <th className="pb-2 font-medium text-right">Abstenções</th>
                      <th className="pb-2 font-medium text-right">Brancos</th>
                      <th className="pb-2 font-medium text-right">Nulos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(locais || []).slice(localPage * localPageSize, (localPage + 1) * localPageSize).map((l, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 font-medium">{l.local}</td>
                        <td className="py-2 text-muted-foreground">{l.bairro}</td>
                        <td className="py-2 text-right">{l.zona}</td>
                        <td className="py-2 text-right">{l.secoes}</td>
                        <td className="py-2 text-right">{formatNumber(l.apto)}</td>
                        <td className="py-2 text-right">{formatNumber(l.comp)}</td>
                        <td className="py-2 text-right font-semibold">{l.apto > 0 ? formatPercent((l.comp / l.apto) * 100) : '-'}</td>
                        <td className="py-2 text-right">{formatNumber(l.abst)}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">{formatNumber(l.brancos)}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">{formatNumber(l.nulos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!locais || locais.length === 0) && <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado.</p>}
              </div>
              {locais && locais.length > 0 && (
                <Pagination page={localPage} totalItems={locais.length} pageSize={localPageSize} onPageChange={setLocalPage} onPageSizeChange={setLocalPageSize} />
              )}
            </div>
          )}
        </TabsContent>

        {/* ════ ZONAS ════ */}
        <TabsContent value="zonas" className="space-y-4">
          {candidatoSelecionado && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Votação de <span className="font-semibold text-foreground">{candidatoSelecionado}</span> por zona
                <button className="ml-2 text-primary text-xs hover:underline" onClick={() => setCandidatoSelecionado(null)}>limpar</button>
              </div>
              {votosCandZona && votosCandZona.length > 0 && (
                <div className="bg-card rounded-xl border p-5">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={votosCandZona.map((v: any) => ({ zona: `Z${v.zona}`, votos: v.total_votos }))}>
                      <XAxis dataKey="zona" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v: number) => formatNumber(v)} />
                      <Tooltip formatter={(v: number) => formatNumber(v)} />
                      <Bar dataKey="votos" name="Votos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="p-4 pb-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="pb-2 font-medium text-left">Zona</th><th className="pb-2 font-medium">Cargo</th><th className="pb-2 font-medium">Partido</th><th className="pb-2 font-medium text-right">Votos</th></tr></thead>
                    <tbody>
                      {(votosCandZona || []).map((v: any, i: number) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2">Zona {v.zona}</td>
                          <td className="py-2 text-muted-foreground">{v.cargo}</td>
                          <td className="py-2"><Badge variant="outline">{v.partido}</Badge></td>
                          <td className="py-2 text-right font-semibold">{formatNumber(v.total_votos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!candidatoSelecionado && (
            <>
              {loadZonas ? <TableSkeleton /> : (
                <>
                  {zonaChart.length > 0 && (
                    <div className="bg-card rounded-xl border p-5">
                      <h3 className="text-sm font-semibold mb-3">Comparecimento por Zona</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={zonaChart}>
                          <XAxis dataKey="zona" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v: number) => formatNumber(v)} />
                          <Tooltip formatter={(v: number) => formatNumber(v)} />
                          <Bar dataKey="eleitorado" name="Eleitorado" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="comparecimento" name="Comparecimento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="bg-card rounded-xl border overflow-hidden">
                    <div className="p-4 pb-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 font-medium">Zona</th>
                            <th className="pb-2 font-medium text-right">Eleitorado</th>
                            <th className="pb-2 font-medium text-right">Comparecimento</th>
                            <th className="pb-2 font-medium text-right">% Comp.</th>
                            <th className="pb-2 font-medium text-right">Abstenções</th>
                            <th className="pb-2 font-medium text-right">Brancos</th>
                            <th className="pb-2 font-medium text-right">Nulos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(zonas || []).map((z, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 font-medium">Zona {z.zona}</td>
                              <td className="py-2 text-right">{formatNumber(z.apto)}</td>
                              <td className="py-2 text-right">{formatNumber(z.comp)}</td>
                              <td className="py-2 text-right font-semibold">{z.apto > 0 ? formatPercent((z.comp / z.apto) * 100) : '-'}</td>
                              <td className="py-2 text-right">{formatNumber(z.abst)}</td>
                              <td className="py-2 text-right text-xs text-muted-foreground">{formatNumber(z.brancos)}</td>
                              <td className="py-2 text-right text-xs text-muted-foreground">{formatNumber(z.nulos)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* ════ PARTIDOS ════ */}
        <TabsContent value="partidos" className="space-y-4">
          {partidosChart.length > 0 && (
            <div className="bg-card rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Votos por Partido — {cidade}</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={partidosChart}>
                  <XAxis dataKey="partido" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v: number) => formatNumber(v)} />
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="votos" name="Votos">
                    {partidosChart.map((p: any, i: number) => <Cell key={i} fill={p.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="p-4 pb-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Partido</th>
                    <th className="pb-2 font-medium text-right">Votos</th>
                    <th className="pb-2 font-medium text-right">Candidatos</th>
                    <th className="pb-2 font-medium text-right">Eleitos</th>
                    <th className="pb-2 font-medium text-right">Mulheres</th>
                    <th className="pb-2 font-medium text-right">% Êxito</th>
                  </tr>
                </thead>
                <tbody>
                  {(partidosCidade || []).map((p: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2"><Badge variant="outline" style={{ borderColor: getPartidoCor(p.partido) }}>{p.partido}</Badge></td>
                      <td className="py-2 text-right font-semibold">{formatNumber(p.votos)}</td>
                      <td className="py-2 text-right">{p.candidatos}</td>
                      <td className="py-2 text-right">{p.eleitos}</td>
                      <td className="py-2 text-right">{p.mulheres}</td>
                      <td className="py-2 text-right">{p.candidatos > 0 ? formatPercent((p.eleitos / p.candidatos) * 100) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ════ COMPARATIVO ════ */}
        <TabsContent value="comparativo" className="space-y-4">
          {comparativo && comparativo.length === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparativo.map((c: any, idx: number) => (
                <div key={idx} className="bg-card rounded-xl border p-5 space-y-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {c.cidade}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-xs text-muted-foreground">Candidatos</span><p className="text-xl font-bold">{formatNumber(c.candidatos)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Eleitos</span><p className="text-xl font-bold">{formatNumber(c.eleitos)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Mulheres</span><p className="text-xl font-bold">{formatNumber(c.mulheres)} <span className="text-sm text-muted-foreground">({c.candidatos > 0 ? formatPercent((c.mulheres / c.candidatos) * 100) : '-'})</span></p></div>
                    <div><span className="text-xs text-muted-foreground">Partidos</span><p className="text-xl font-bold">{c.partidos}</p></div>
                    <div><span className="text-xs text-muted-foreground">Eleitorado</span><p className="text-xl font-bold">{formatNumber(c.eleitorado)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Comparecimento</span><p className="text-xl font-bold">{c.eleitorado > 0 ? formatPercent((c.comparecimento / c.eleitorado) * 100) : '-'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Abstenções</span><p className="text-xl font-bold">{formatNumber(c.abstencoes)}</p></div>
                    <div><span className="text-xs text-muted-foreground">% Êxito</span><p className="text-xl font-bold">{c.candidatos > 0 ? formatPercent((c.eleitos / c.candidatos) * 100) : '-'}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {comparativo && comparativo.length === 2 && (
            <div className="bg-card rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Comparativo Visual</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { metrica: 'Candidatos', [comparativo[0].cidade]: comparativo[0].candidatos, [comparativo[1].cidade]: comparativo[1].candidatos },
                  { metrica: 'Eleitos', [comparativo[0].cidade]: comparativo[0].eleitos, [comparativo[1].cidade]: comparativo[1].eleitos },
                  { metrica: 'Mulheres', [comparativo[0].cidade]: comparativo[0].mulheres, [comparativo[1].cidade]: comparativo[1].mulheres },
                  { metrica: 'Partidos', [comparativo[0].cidade]: comparativo[0].partidos, [comparativo[1].cidade]: comparativo[1].partidos },
                ]}>
                  <XAxis dataKey="metrica" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={comparativo[0].cidade} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={comparativo[1].cidade} fill="hsl(190, 80%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
