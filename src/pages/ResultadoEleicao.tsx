import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Vote, Users, Trophy, TrendingUp, Filter, DollarSign, GraduationCap, Briefcase } from 'lucide-react';
import {
  useOpcoesResultado, useCandidatosCompletos, useBensCandidatos,
  type FiltrosResultado,
} from '@/hooks/useResultadoEleicao';

const ANOS = [2024, 2022, 2020, 2018, 2016, 2014, 2012];
const TURNOS = [1, 2];
const COLORS = ['#1a56db', '#16bdca', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#6366f1', '#ec4899', '#14b8a6'];

function fmt(n: number) { return n.toLocaleString('pt-BR'); }
function fmtMoeda(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function KPICard({ title, value, icon: Icon, sub }: { title: string; value: string; icon: any; sub?: string }) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingTable({ data, colLabel, colValue, maxRows = 30 }: { data: { label: string; value: number; extra?: string }[]; colLabel: string; colValue: string; maxRows?: number }) {
  const sliced = data.slice(0, maxRows);
  const max = sliced[0]?.value || 1;
  if (sliced.length === 0) return <p className="text-xs text-muted-foreground p-4 text-center">Sem dados para os filtros selecionados</p>;
  return (
    <ScrollArea className="h-[400px]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border/30">
            <th className="text-left py-2 px-2 text-muted-foreground font-medium w-8">#</th>
            <th className="text-left py-2 px-2 text-muted-foreground font-medium">{colLabel}</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">{colValue}</th>
          </tr>
        </thead>
        <tbody>
          {sliced.map((r, i) => (
            <tr key={i} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
              <td className="py-1.5 px-2 text-muted-foreground">{i + 1}</td>
              <td className="py-1.5 px-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground font-medium truncate max-w-[200px]">{r.label}</span>
                  {r.extra && <span className="text-[10px] text-muted-foreground">{r.extra}</span>}
                </div>
                <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary/60" style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
              </td>
              <td className="py-1.5 px-2 text-right font-mono font-semibold text-foreground whitespace-nowrap">{typeof r.value === 'number' && r.value > 999 ? fmt(r.value) : r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

export default function ResultadoEleicao() {
  const [ano, setAno] = useState(2024);
  const [turno, setTurno] = useState(1);
  const [cargo, setCargo] = useState<string | null>(null);
  const [partido, setPartido] = useState<string | null>(null);
  const [genero, setGenero] = useState<string | null>(null);
  const [situacao, setSituacao] = useState<string | null>(null);

  const filtros: FiltrosResultado = { ano, turno, cargo, partido, genero, situacao };

  const { data: opcoes } = useOpcoesResultado(ano);
  const { data: candidatos, isLoading: loadCand } = useCandidatosCompletos(filtros);
  const { data: bensMap, isLoading: loadBens } = useBensCandidatos(ano);

  const isLoading = loadCand || loadBens;

  // ── Computed aggregations ──
  const stats = useMemo(() => {
    if (!candidatos) return null;
    const total = candidatos.length;
    const eleitos = candidatos.filter(c => c.situacao_final?.includes('ELEITO')).length;

    // By partido
    const byPartido: Record<string, number> = {};
    // By cargo
    const byCargo: Record<string, number> = {};
    // By genero
    const byGenero: Record<string, number> = {};
    // By situacao
    const bySituacao: Record<string, number> = {};
    // By escolaridade
    const byEscolaridade: Record<string, number> = {};
    // By ocupacao
    const byOcupacao: Record<string, number> = {};
    // Top patrimonio
    const patrimonios: { nome: string; partido: string; valor: number }[] = [];

    candidatos.forEach(c => {
      const p = c.sigla_partido || 'Outros';
      byPartido[p] = (byPartido[p] || 0) + 1;
      const ca = c.cargo || 'Outros';
      byCargo[ca] = (byCargo[ca] || 0) + 1;
      const g = c.genero || 'Não informado';
      byGenero[g] = (byGenero[g] || 0) + 1;
      const s = c.situacao_final || 'Não informado';
      bySituacao[s] = (bySituacao[s] || 0) + 1;
      const e = c.grau_instrucao || 'Não informado';
      byEscolaridade[e] = (byEscolaridade[e] || 0) + 1;
      const o = c.ocupacao || 'Não informada';
      byOcupacao[o] = (byOcupacao[o] || 0) + 1;

      if (bensMap && c.sequencial_candidato && bensMap[c.sequencial_candidato]) {
        patrimonios.push({
          nome: c.nome_urna || c.nome_completo || '?',
          partido: p,
          valor: bensMap[c.sequencial_candidato],
        });
      }
    });

    const sortObj = (obj: Record<string, number>) =>
      Object.entries(obj).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    return {
      total,
      eleitos,
      byPartido: sortObj(byPartido),
      byCargo: sortObj(byCargo),
      byGenero: sortObj(byGenero),
      bySituacao: sortObj(bySituacao),
      byEscolaridade: sortObj(byEscolaridade),
      byOcupacao: sortObj(byOcupacao),
      topPatrimonio: patrimonios.sort((a, b) => b.valor - a.valor).slice(0, 30),
    };
  }, [candidatos, bensMap]);

  const limparFiltros = () => { setCargo(null); setPartido(null); setGenero(null); setSituacao(null); };
  const activeCount = [cargo, partido, genero, situacao].filter(Boolean).length;

  const totalPatrimonio = useMemo(() => {
    if (!stats) return 0;
    return stats.topPatrimonio.reduce((s, r) => s + r.valor, 0);
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Resultado por Eleição</h1>
          <p className="text-xs text-muted-foreground">Análise detalhada de candidaturas — dados do TSE/Goiás</p>
        </div>
        {activeCount > 0 && (
          <button onClick={limparFiltros} className="text-xs text-primary hover:underline">Limpar filtros ({activeCount})</button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtros</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <Select value={String(ano)} onValueChange={v => { setAno(Number(v)); limparFiltros(); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(turno)} onValueChange={v => setTurno(Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Turno" /></SelectTrigger>
              <SelectContent>{TURNOS.map(t => <SelectItem key={t} value={String(t)}>{t}º Turno</SelectItem>)}</SelectContent>
            </Select>
            <Select value={cargo || '_all'} onValueChange={v => setCargo(v === '_all' ? null : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os cargos</SelectItem>
                {(opcoes?.cargos || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={partido || '_all'} onValueChange={v => setPartido(v === '_all' ? null : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Partido" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os partidos</SelectItem>
                {(opcoes?.partidos || []).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={genero || '_all'} onValueChange={v => setGenero(v === '_all' ? null : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Gênero" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                {(opcoes?.generos || []).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={situacao || '_all'} onValueChange={v => setSituacao(v === '_all' ? null : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Situação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas</SelectItem>
                {(opcoes?.situacoes || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {cargo && <Badge variant="secondary" className="text-[10px]">Cargo: {cargo}</Badge>}
              {partido && <Badge variant="secondary" className="text-[10px]">Partido: {partido}</Badge>}
              {genero && <Badge variant="secondary" className="text-[10px]">Gênero: {genero}</Badge>}
              {situacao && <Badge variant="secondary" className="text-[10px]">Situação: {situacao}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total de Candidatos" value={isLoading ? '...' : fmt(stats?.total || 0)} icon={Users} />
        <KPICard title="Eleitos" value={isLoading ? '...' : fmt(stats?.eleitos || 0)} icon={Trophy} sub={stats ? `${((stats.eleitos / stats.total) * 100).toFixed(1)}% do total` : ''} />
        <KPICard title="Partidos" value={isLoading ? '...' : fmt(stats?.byPartido.length || 0)} icon={TrendingUp} />
        <KPICard title="Patrimônio Declarado" value={isLoading ? '...' : fmtMoeda(totalPatrimonio)} icon={DollarSign} sub={`${stats?.topPatrimonio.length || 0} candidatos com bens`} />
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="partidos" className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border/50 h-9 flex-wrap">
          <TabsTrigger value="partidos" className="text-xs">Partidos</TabsTrigger>
          <TabsTrigger value="situacao" className="text-xs">Situação</TabsTrigger>
          <TabsTrigger value="genero" className="text-xs">Gênero</TabsTrigger>
          <TabsTrigger value="escolaridade" className="text-xs">Escolaridade</TabsTrigger>
          <TabsTrigger value="ocupacao" className="text-xs">Ocupação</TabsTrigger>
          <TabsTrigger value="patrimonio" className="text-xs">Patrimônio</TabsTrigger>
        </TabsList>

        {/* ── Partidos ── */}
        <TabsContent value="partidos" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" />Candidatos por Partido</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <RankingTable data={stats?.byPartido || []} colLabel="Partido" colValue="Candidatos" />
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Top 15 Partidos</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={(stats?.byPartido || []).slice(0, 15)} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="label" width={70} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Situação ── */}
        <TabsContent value="situacao" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Distribuição por Situação Final</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <RankingTable data={stats?.bySituacao || []} colLabel="Situação" colValue="Qtd" />
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Proporção</CardTitle></CardHeader>
              <CardContent className="p-3 flex items-center justify-center">
                {isLoading ? <Skeleton className="h-[400px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie data={(stats?.bySituacao || []).slice(0, 8).map(r => ({ name: r.label, value: r.value }))}
                        cx="50%" cy="50%" outerRadius={140} innerRadius={60} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {(stats?.bySituacao || []).slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Gênero ── */}
        <TabsContent value="genero" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Candidatos por Gênero</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <RankingTable data={stats?.byGenero || []} colLabel="Gênero" colValue="Qtd" />
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Distribuição</CardTitle></CardHeader>
              <CardContent className="p-3 flex items-center justify-center">
                {isLoading ? <Skeleton className="h-[400px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie data={(stats?.byGenero || []).map(r => ({ name: r.label, value: r.value }))}
                        cx="50%" cy="50%" outerRadius={140} innerRadius={60} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {(stats?.byGenero || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Escolaridade ── */}
        <TabsContent value="escolaridade" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Por Escolaridade</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <RankingTable data={stats?.byEscolaridade || []} colLabel="Escolaridade" colValue="Qtd" />
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Distribuição</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={(stats?.byEscolaridade || []).slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 8 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="value" fill="#16bdca" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Ocupação ── */}
        <TabsContent value="ocupacao" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />Por Ocupação</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <RankingTable data={stats?.byOcupacao || []} colLabel="Ocupação" colValue="Qtd" />
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Top 15 Ocupações</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={(stats?.byOcupacao || []).slice(0, 15)} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 8 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Patrimônio ── */}
        <TabsContent value="patrimonio" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />Maiores Patrimônios Declarados</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <RankingTable
                    data={(stats?.topPatrimonio || []).map(r => ({ label: r.nome, value: r.valor, extra: r.partido }))}
                    colLabel="Candidato" colValue="Patrimônio (R$)"
                  />
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">Top 15 Patrimônios</CardTitle></CardHeader>
              <CardContent className="p-3">
                {isLoading ? <Skeleton className="h-[400px]" /> : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={(stats?.topPatrimonio || []).slice(0, 15).map(r => ({ nome: r.nome.substring(0, 20), valor: r.valor }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tickFormatter={v => fmtMoeda(v)} tick={{ fontSize: 9 }} />
                      <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 8 }} />
                      <Tooltip formatter={(v: number) => fmtMoeda(v)} />
                      <Bar dataKey="valor" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
