import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, HandHelping, BarChart3, GraduationCap, Palette } from 'lucide-react';
import { useMesarios, useFuncoesEspeciais } from '@/hooks/useMesarios';
import { useFilterStore } from '@/stores/filterStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = [
  'hsl(330, 81%, 60%)', 'hsl(42, 47%, 59%)', 'hsl(200, 80%, 55%)',
  'hsl(156, 72%, 40%)', 'hsl(0, 84%, 60%)', 'hsl(270, 60%, 55%)',
  'hsl(30, 80%, 55%)', 'hsl(180, 60%, 45%)', 'hsl(60, 70%, 50%)',
  'hsl(300, 50%, 50%)',
];

function aggregate(rows: any[], field: string) {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const key = r[field] || 'Não informado';
    map[key] = (map[key] || 0) + (r.qt_convocados || 1);
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function KPICard({ title, value, icon: Icon, sub }: { title: string; value: string | number; icon: any; sub?: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {children}
      </CardContent>
    </Card>
  );
}

function PieChartBlock({ data, height = 250 }: { data: { name: string; value: number }[]; height?: number }) {
  const top = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={top} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
          {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function BarChartBlock({ data, height = 250 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" fontSize={10} tickFormatter={(v) => v.toLocaleString('pt-BR')} />
        <YAxis type="category" dataKey="name" width={120} fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Mesarios() {
  const { data: mesarios, isLoading: loadingM } = useMesarios();
  const { data: fe, isLoading: loadingFE } = useFuncoesEspeciais();
  const ano = useFilterStore((s) => s.ano);
  const municipio = useFilterStore((s) => s.municipio);

  const stats = useMemo(() => {
    if (!mesarios?.length) return null;
    const total = mesarios.reduce((s, r) => s + (r.qt_convocados || 0), 0);
    const voluntarios = mesarios.filter(r => r.voluntario === 'S' || r.voluntario === 'SIM').reduce((s, r) => s + (r.qt_convocados || 0), 0);
    const compareceu = mesarios.filter(r => r.comparecimento === 'S' || r.comparecimento === 'SIM').reduce((s, r) => s + (r.qt_convocados || 0), 0);
    const zonas = new Set(mesarios.map(r => r.zona).filter(Boolean)).size;
    return { total, voluntarios, compareceu, zonas, pctVol: total ? ((voluntarios / total) * 100).toFixed(1) : '0', pctComp: total ? ((compareceu / total) * 100).toFixed(1) : '0' };
  }, [mesarios]);

  const feStats = useMemo(() => {
    if (!fe?.length) return null;
    const total = fe.reduce((s, r) => s + (r.qt_convocados || 0), 0);
    return { total, funcoes: aggregate(fe, 'funcao_especial') };
  }, [fe]);

  const generoData = useMemo(() => mesarios ? aggregate(mesarios, 'genero') : [], [mesarios]);
  const faixaData = useMemo(() => mesarios ? aggregate(mesarios, 'faixa_etaria') : [], [mesarios]);
  const instrucaoData = useMemo(() => mesarios ? aggregate(mesarios, 'grau_instrucao') : [], [mesarios]);
  const racaData = useMemo(() => mesarios ? aggregate(mesarios, 'cor_raca') : [], [mesarios]);
  const tipoData = useMemo(() => mesarios ? aggregate(mesarios, 'tipo_mesario') : [], [mesarios]);
  const atividadeData = useMemo(() => mesarios ? aggregate(mesarios, 'atividade_eleitoral') : [], [mesarios]);

  if (loadingM || loadingFE) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const anosDisponiveis = [2020, 2022, 2024];
  const anoDisponivel = anosDisponiveis.includes(ano);

  if (!anoDisponivel) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">Mesários & Funções Especiais</h1>
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Dados de mesários disponíveis apenas para 2020, 2022 e 2024.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Mesários & Funções Especiais</h1>
          <p className="text-xs text-muted-foreground">{municipio} — {ano} • Fonte: TSE</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {stats?.total?.toLocaleString('pt-BR') || 0} convocados
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Convocados" value={stats?.total || 0} icon={Users} />
        <KPICard title="Voluntários" value={stats?.voluntarios || 0} icon={HandHelping} sub={`${stats?.pctVol}% do total`} />
        <KPICard title="Compareceram" value={stats?.compareceu || 0} icon={UserCheck} sub={`${stats?.pctComp}% do total`} />
        <KPICard title="Zonas Cobertas" value={stats?.zonas || 0} icon={BarChart3} />
      </div>

      <Tabs defaultValue="perfil" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="perfil" className="text-xs">Perfil Demográfico</TabsTrigger>
          <TabsTrigger value="atividade" className="text-xs">Tipo & Atividade</TabsTrigger>
          <TabsTrigger value="funcoes" className="text-xs">Funções Especiais</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChartCard title="Gênero">
              <PieChartBlock data={generoData} />
            </ChartCard>
            <ChartCard title="Faixa Etária">
              <BarChartBlock data={faixaData} height={280} />
            </ChartCard>
            <ChartCard title="Grau de Instrução">
              <BarChartBlock data={instrucaoData} height={280} />
            </ChartCard>
            <ChartCard title="Cor / Raça">
              <PieChartBlock data={racaData} />
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="atividade" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChartCard title="Tipo de Mesário">
              <PieChartBlock data={tipoData} />
            </ChartCard>
            <ChartCard title="Atividade Eleitoral">
              <BarChartBlock data={atividadeData} height={280} />
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="funcoes" className="space-y-3">
          {feStats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KPICard title="Total Funções Especiais" value={feStats.total} icon={GraduationCap} />
                <KPICard title="Tipos de Função" value={feStats.funcoes.length} icon={Palette} />
              </div>
              <ChartCard title="Funções Especiais por Tipo">
                <BarChartBlock data={feStats.funcoes} height={320} />
              </ChartCard>
            </>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Sem dados de funções especiais para este filtro.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
