import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFilterStore } from '@/stores/filterStore';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, ChevronDown, ChevronRight, School, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

function useMesariosCompleto() {
  const ano = useFilterStore((s) => s.ano);
  const municipio = useFilterStore((s) => s.municipio);
  const zona = useFilterStore((s) => s.zona);

  return useQuery({
    queryKey: ['mesarios-completo', ano, municipio, zona],
    queryFn: async () => {
      let q = supabase
        .from('bd_eleicoes_mesarios')
        .select('*')
        .eq('ano', ano)
        .eq('municipio', municipio);
      if (zona) q = q.eq('zona', zona);
      const { data, error } = await q.order('zona').order('qt_convocados', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!municipio,
    staleTime: 5 * 60_000,
  });
}

function useFuncoesCompleto() {
  const ano = useFilterStore((s) => s.ano);
  const municipio = useFilterStore((s) => s.municipio);
  const zona = useFilterStore((s) => s.zona);

  return useQuery({
    queryKey: ['funcoes-completo', ano, municipio, zona],
    queryFn: async () => {
      let q = supabase
        .from('bd_eleicoes_mesarios_funcoes_especiais')
        .select('*')
        .eq('ano', ano)
        .eq('municipio', municipio);
      if (zona) q = q.eq('zona', zona);
      const { data, error } = await q.order('zona').order('qt_convocados', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!municipio,
    staleTime: 5 * 60_000,
  });
}

function useLocais() {
  const ano = useFilterStore((s) => s.ano);
  const municipio = useFilterStore((s) => s.municipio);
  const zona = useFilterStore((s) => s.zona);

  return useQuery({
    queryKey: ['locais-mesarios', ano, municipio, zona],
    queryFn: async () => {
      let q = supabase
        .from('bd_eleicoes_locais_votacao')
        .select('zona, local_votacao, bairro, endereco_local, eleitorado_apto, secao')
        .eq('ano', ano)
        .eq('municipio', municipio);
      if (zona) q = q.eq('zona', zona);
      const { data, error } = await q.limit(5000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!municipio,
    staleTime: 5 * 60_000,
  });
}

interface EscolaGroup {
  escola: string;
  bairro: string;
  endereco: string;
  zona: number;
  eleitores: number;
  secoes: number;
  mesarios: any[];
  funcoes: any[];
  totalConvocados: number;
  totalFuncoes: number;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

export default function Mesarios() {
  const { data: mesarios, isLoading: lM } = useMesariosCompleto();
  const { data: funcoes, isLoading: lF } = useFuncoesCompleto();
  const { data: locais, isLoading: lL } = useLocais();
  const { municipio, ano, zona: zonaFiltro } = useFilterStore();
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const escolas = useMemo(() => {
    if (!mesarios) return [];

    // Indexa mesários e funções por zona
    const mesPorZona = new Map<number, any[]>();
    for (const m of mesarios) {
      const z = m.zona || 0;
      if (!mesPorZona.has(z)) mesPorZona.set(z, []);
      mesPorZona.get(z)!.push(m);
    }
    const funPorZona = new Map<number, any[]>();
    for (const f of (funcoes || [])) {
      const z = f.zona || 0;
      if (!funPorZona.has(z)) funPorZona.set(z, []);
      funPorZona.get(z)!.push(f);
    }

    // Se temos locais de votação, agrupa por escola
    if (locais && locais.length > 0) {
      const map = new Map<string, { escola: string; bairro: string; endereco: string; zona: number; eleitores: number; secoes: Set<number> }>();
      for (const l of locais) {
        const key = `${l.local_votacao || 'Zona ' + l.zona}__${l.zona}`;
        if (!map.has(key)) {
          map.set(key, {
            escola: l.local_votacao || `Zona ${l.zona}`,
            bairro: l.bairro || '',
            endereco: l.endereco_local || '',
            zona: l.zona || 0,
            eleitores: 0,
            secoes: new Set(),
          });
        }
        const e = map.get(key)!;
        e.eleitores += l.eleitorado_apto || 0;
        if (l.secao) e.secoes.add(l.secao);
      }

      const result: EscolaGroup[] = [];
      for (const [, info] of map) {
        const mes = mesPorZona.get(info.zona) || [];
        const fun = funPorZona.get(info.zona) || [];
        result.push({
          escola: info.escola,
          bairro: info.bairro,
          endereco: info.endereco,
          zona: info.zona,
          eleitores: info.eleitores,
          secoes: info.secoes.size,
          mesarios: mes,
          funcoes: fun,
          totalConvocados: mes.reduce((s, r) => s + (r.qt_convocados || 0), 0),
          totalFuncoes: fun.reduce((s, r) => s + (r.qt_convocados || 0), 0),
        });
      }
      return result.sort((a, b) => a.escola.localeCompare(b.escola));
    }

    // Fallback: agrupa por zona quando não há locais de votação
    const result: EscolaGroup[] = [];
    for (const [zona, mes] of mesPorZona) {
      const fun = funPorZona.get(zona) || [];
      result.push({
        escola: `Zona Eleitoral ${zona}`,
        bairro: '',
        endereco: '',
        zona,
        eleitores: 0,
        secoes: 0,
        mesarios: mes,
        funcoes: fun,
        totalConvocados: mes.reduce((s, r) => s + (r.qt_convocados || 0), 0),
        totalFuncoes: fun.reduce((s, r) => s + (r.qt_convocados || 0), 0),
      });
    }
    return result.sort((a, b) => a.zona - b.zona);
  }, [locais, mesarios, funcoes]);

  const filtered = useMemo(() => {
    if (!busca) return escolas;
    const q = busca.toLowerCase();
    return escolas.filter(e =>
      e.escola.toLowerCase().includes(q) ||
      e.bairro.toLowerCase().includes(q) ||
      e.zona.toString().includes(q) ||
      e.endereco.toLowerCase().includes(q)
    );
  }, [escolas, busca]);

  const totalGeral = escolas.reduce((s, e) => s + e.totalConvocados, 0);
  const totalEleitores = escolas.reduce((s, e) => s + e.eleitores, 0);

  if (lM || lF || lL) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-full" />
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Mesários por Escola</h1>
          <p className="text-xs text-muted-foreground">
            {municipio}{zonaFiltro ? ` • Zona ${zonaFiltro}` : ''} — {ano} • Fonte: TSE
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">{filtered.length} escolas</Badge>
          <Badge variant="outline" className="text-[10px]">{fmt(totalGeral)} convocados</Badge>
          <Badge variant="outline" className="text-[10px]">{fmt(totalEleitores)} eleitores</Badge>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar escola, bairro, endereço ou zona..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <School className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma escola encontrada.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-1">
          {filtered.map((e) => {
            const open = expandido === `${e.escola}__${e.zona}`;
            return (
              <div key={`${e.escola}__${e.zona}`} className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandido(open ? null : `${e.escola}__${e.zona}`)}
                  className={cn("w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors", open && "bg-muted/30")}
                >
                  {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <School className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{e.escola}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                      {e.bairro && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{e.bairro}</span>}
                      <span>Zona {e.zona}</span>
                      <span>{e.secoes} seções</span>
                      <span>{fmt(e.eleitores)} eleitores</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs font-bold text-primary">{fmt(e.totalConvocados)}</p>
                    <p className="text-[9px] text-muted-foreground">mesários</p>
                  </div>
                </button>

                {open && <Detalhe escola={e} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detalhe({ escola }: { escola: EscolaGroup }) {
  const { mesarios, funcoes } = escola;
  const [tabAtiva, setTabAtiva] = useState<'mesarios' | 'funcoes'>('mesarios');

  // Resumos
  const resumo = useMemo(() => {
    const total = mesarios.reduce((s, r) => s + (r.qt_convocados || 0), 0);
    const vol = mesarios.filter(r => r.voluntario === 'S' || r.voluntario === 'SIM').reduce((s, r) => s + (r.qt_convocados || 0), 0);
    const comp = mesarios.filter(r => r.comparecimento === 'S' || r.comparecimento === 'SIM').reduce((s, r) => s + (r.qt_convocados || 0), 0);
    return { total, vol, comp };
  }, [mesarios]);

  return (
    <div className="bg-muted/10 border-t border-border/30 p-4 space-y-3">
      {escola.endereco && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {escola.endereco}
        </p>
      )}

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <MiniKPI label="Convocados" value={fmt(resumo.total)} />
        <MiniKPI label="Voluntários" value={fmt(resumo.vol)} accent="text-green-600" />
        <MiniKPI label="Compareceram" value={fmt(resumo.comp)} accent="text-primary" />
        <MiniKPI label="Eleitores" value={fmt(escola.eleitores)} />
        <MiniKPI label="Funções Esp." value={fmt(escola.totalFuncoes)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setTabAtiva('mesarios')}
          className={cn("px-3 py-1 rounded-md text-[10px] font-medium transition-colors",
            tabAtiva === 'mesarios' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Mesários ({mesarios.length})
        </button>
        {funcoes.length > 0 && (
          <button
            onClick={() => setTabAtiva('funcoes')}
            className={cn("px-3 py-1 rounded-md text-[10px] font-medium transition-colors",
              tabAtiva === 'funcoes' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Funções Especiais ({funcoes.length})
          </button>
        )}
      </div>

      {tabAtiva === 'mesarios' && mesarios.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/30 max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-[10px]">Turno</TableHead>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px]">Atividade</TableHead>
                <TableHead className="text-[10px]">Gênero</TableHead>
                <TableHead className="text-[10px]">Faixa Etária</TableHead>
                <TableHead className="text-[10px]">Instrução</TableHead>
                <TableHead className="text-[10px]">Cor/Raça</TableHead>
                <TableHead className="text-[10px]">Estado Civil</TableHead>
                <TableHead className="text-[10px]">Voluntário</TableHead>
                <TableHead className="text-[10px]">Compareceu</TableHead>
                <TableHead className="text-[10px] text-right">Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mesarios.map((m: any, i: number) => (
                <TableRow key={i} className="border-border/20">
                  <TableCell className="text-xs">{m.turno || '-'}</TableCell>
                  <TableCell className="text-xs">{m.tipo_mesario || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate">{m.atividade_eleitoral || '-'}</TableCell>
                  <TableCell className="text-xs">{m.genero || '-'}</TableCell>
                  <TableCell className="text-xs">{m.faixa_etaria || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[110px] truncate">{m.grau_instrucao || '-'}</TableCell>
                  <TableCell className="text-xs">{m.cor_raca || '-'}</TableCell>
                  <TableCell className="text-xs">{m.estado_civil || '-'}</TableCell>
                  <TableCell className="text-xs">
                    <SimNao val={m.voluntario} />
                  </TableCell>
                  <TableCell className="text-xs">
                    <SimNao val={m.comparecimento} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-bold">{fmt(m.qt_convocados || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tabAtiva === 'funcoes' && funcoes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/30 max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-[10px]">Função</TableHead>
                <TableHead className="text-[10px]">Turno</TableHead>
                <TableHead className="text-[10px]">Gênero</TableHead>
                <TableHead className="text-[10px]">Faixa Etária</TableHead>
                <TableHead className="text-[10px]">Instrução</TableHead>
                <TableHead className="text-[10px]">Cor/Raça</TableHead>
                <TableHead className="text-[10px]">Voluntário</TableHead>
                <TableHead className="text-[10px]">Compareceu</TableHead>
                <TableHead className="text-[10px] text-right">Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcoes.map((f: any, i: number) => (
                <TableRow key={i} className="border-border/20">
                  <TableCell className="text-xs font-medium">{f.funcao_especial || '-'}</TableCell>
                  <TableCell className="text-xs">{f.turno || '-'}</TableCell>
                  <TableCell className="text-xs">{f.genero || '-'}</TableCell>
                  <TableCell className="text-xs">{f.faixa_etaria || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[110px] truncate">{f.grau_instrucao || '-'}</TableCell>
                  <TableCell className="text-xs">{f.cor_raca || '-'}</TableCell>
                  <TableCell className="text-xs"><SimNao val={f.voluntario} /></TableCell>
                  <TableCell className="text-xs"><SimNao val={f.comparecimento} /></TableCell>
                  <TableCell className="text-xs text-right font-bold">{fmt(f.qt_convocados || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {mesarios.length === 0 && (
        <p className="text-xs text-muted-foreground">Sem dados de mesários para esta zona.</p>
      )}
    </div>
  );
}

function MiniKPI({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-card rounded-lg border border-border/40 p-2 text-center">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-bold", accent || "text-foreground")}>{value}</p>
    </div>
  );
}

function SimNao({ val }: { val: string | null }) {
  const sim = val === 'S' || val === 'SIM';
  return (
    <Badge variant={sim ? 'default' : 'outline'} className="text-[8px] h-4">
      {sim ? 'Sim' : 'Não'}
    </Badge>
  );
}
