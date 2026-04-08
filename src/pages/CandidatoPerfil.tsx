import { useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, Building2, Calendar, ChevronDown, ChevronUp, Coins, ExternalLink, GraduationCap, Landmark, MapPinned, Search, Shield, TrendingUp, User, Vote, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  mdQuery,
  getTableName,
  getAnosDisponiveis,
  sqlPerfilCandidato,
  sqlPatrimonioCandidato,
  sqlBensCandidato,
  sqlHistoricoComVotos,
  sqlVotosHistoricoPorZona,
  sqlVotacaoTerritorialDetalhada,
  sqlComposicaoVotosCandidato,
} from '@/lib/motherduck';
import { useFilterStore } from '@/stores/filterStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/eleicoes';
import { cn } from '@/lib/utils';

type AnyRow = Record<string, any>;

function isNil(v: unknown) { return v === null || v === undefined || v === ''; }

function calcIdade(nasc: string | null | undefined): number | null {
  if (!nasc) return null;
  try {
    const parts = String(nasc).split('/');
    if (parts.length === 3) {
      const dt = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      return Math.floor((Date.now() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
    const dt = new Date(nasc);
    if (!isNaN(dt.getTime())) return Math.floor((Date.now() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return null;
  } catch { return null; }
}

function getSitColor(sit: string | null) {
  if (!sit) return 'bg-muted text-muted-foreground';
  const s = sit.toUpperCase();
  if (s.includes('ELEIT') || s.includes('MÉDIA')) return 'bg-green-100 text-green-800 border-green-300';
  if (s.includes('TURNO') || s.includes('2º')) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (s.includes('SUPLENTE')) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (s.includes('NÃO ELEIT')) return 'bg-red-100 text-red-800 border-red-300';
  return 'bg-muted text-muted-foreground';
}

function pickKey(row: AnyRow, candidates: string[]) {
  const keys = Object.keys(row);
  const lowerToActual = new Map(keys.map(k => [k.toLowerCase(), k]));
  for (const c of candidates) {
    const actual = lowerToActual.get(c.toLowerCase());
    if (actual) return actual;
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// LOADING
// ═══════════════════════════════════════════════════════

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// VOTE COMPOSITION WITH SEARCH
// ═══════════════════════════════════════════════════════

function VoteCompositionSection({
  composicaoRows,
  isLoading,
  nrCandidato,
  ano,
}: {
  composicaoRows: AnyRow[];
  isLoading: boolean;
  nrCandidato: string | number | null;
  ano: number;
}) {
  const [busca, setBusca] = useState('');

  const totalGeral = useMemo(
    () => composicaoRows.reduce((s, r) => s + Number(r.total_votos || 0), 0),
    [composicaoRows],
  );

  const filtered = useMemo(() => {
    if (!busca) return composicaoRows;
    const q = busca.toLowerCase();
    return composicaoRows.filter(r =>
      String(r.bairro || '').toLowerCase().includes(q) ||
      String(r.escola || '').toLowerCase().includes(q) ||
      String(r.zona || '').includes(q)
    );
  }, [composicaoRows, busca]);

  const porBairro = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const b = String(r.bairro || 'NÃO INFORMADO');
      map.set(b, (map.get(b) || 0) + Number(r.total_votos || 0));
    }
    return [...map.entries()]
      .map(([bairro, votos]) => ({ bairro, votos }))
      .sort((a, b) => b.votos - a.votos);
  }, [filtered]);

  const porZona = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const z = String(r.zona || '');
      map.set(z, (map.get(z) || 0) + Number(r.total_votos || 0));
    }
    return [...map.entries()]
      .map(([zona, votos]) => ({ zona, votos }))
      .sort((a, b) => b.votos - a.votos);
  }, [filtered]);

  const totalFiltered = useMemo(
    () => filtered.reduce((s, r) => s + Number(r.total_votos || 0), 0),
    [filtered],
  );

  return (
    <section className="bg-white rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <MapPinned className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">Composição de Votos</h3>
        {totalGeral > 0 && (
          <Badge className="bg-primary text-primary-foreground text-[10px]">
            {totalGeral.toLocaleString('pt-BR')} votos
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por zona, bairro ou escola..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : composicaoRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {!nrCandidato ? 'Número de urna não disponível.' : `Sem dados de votação detalhada para ${ano}.`}
        </p>
      ) : (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KpiCard label="Total de Votos" value={totalFiltered.toLocaleString('pt-BR')} />
            <KpiCard label="Zonas Eleitorais" value={String(porZona.length)} />
            <KpiCard label="Bairros" value={String(porBairro.length)} />
            <KpiCard label="Locais de Votação" value={String(filtered.length)} />
          </div>

          {/* Bairros */}
          {porBairro.length > 0 && (
            <VoteTable
              title="Votos por Bairro"
              columns={['Bairro', 'Votos', '%']}
              rows={porBairro.slice(0, 30).map((r, i) => {
                const pct = totalFiltered > 0 ? (r.votos / totalFiltered) * 100 : 0;
                return [r.bairro, r.votos.toLocaleString('pt-BR'), `${pct.toFixed(1)}%`, pct];
              })}
            />
          )}

          {/* Zonas */}
          {porZona.length > 0 && (
            <VoteTable
              title="Votos por Zona Eleitoral"
              columns={['Zona', 'Votos', '%']}
              rows={porZona.map((r) => {
                const pct = totalFiltered > 0 ? (r.votos / totalFiltered) * 100 : 0;
                return [r.zona, r.votos.toLocaleString('pt-BR'), `${pct.toFixed(1)}%`, pct];
              })}
            />
          )}

          {/* Escolas */}
          {filtered.length > 0 && (
            <VoteTable
              title="Votos por Local de Votação"
              columns={['Zona', 'Bairro', 'Escola', 'Votos', '%']}
              rows={[...filtered]
                .sort((a, b) => Number(b.total_votos || 0) - Number(a.total_votos || 0))
                .slice(0, 50)
                .map(r => {
                  const v = Number(r.total_votos || 0);
                  const pct = totalFiltered > 0 ? (v / totalFiltered) * 100 : 0;
                  return [r.zona, r.bairro, r.escola, v.toLocaleString('pt-BR'), `${pct.toFixed(1)}%`, pct];
                })}
            />
          )}
        </div>
      )}
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3 bg-slate-50">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function VoteTable({ title, columns, rows }: { title: string; columns: string[]; rows: any[][] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-border">
        {title}
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead className="text-[10px] text-slate-500 w-[40px]">#</TableHead>
              {columns.map(c => (
                <TableHead key={c} className="text-[10px] text-slate-500">{c}</TableHead>
              ))}
              <TableHead className="text-[10px] text-slate-500 w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((cells, i) => {
              const pct = cells[cells.length - 1] as number;
              const displayCells = cells.slice(0, -1);
              return (
                <TableRow key={i} className="border-border/20">
                  <TableCell className="text-xs text-slate-400 font-mono">{i + 1}</TableCell>
                  {displayCells.map((c, j) => (
                    <TableCell key={j} className={cn("text-sm", j === displayCells.length - 2 ? "font-bold font-mono" : "")}>{c}</TableCell>
                  ))}
                  <TableCell>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct * 2, 100)}%` }} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ELECTORAL HISTORY
// ═══════════════════════════════════════════════════════

function HistoricoEleitoral({ historico, currentAno }: { historico: AnyRow[]; currentAno: number }) {
  if (!historico.length) return null;

  const partidos = [...new Set(historico.map(h => h.partido))];
  const mudouPartido = partidos.length > 1;

  return (
    <section className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">Histórico Eleitoral (2014–2024)</h3>
        {mudouPartido && (
          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
            Trocou de partido
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px]">
          {historico.length} {historico.length === 1 ? 'eleição' : 'eleições'}
        </Badge>
      </div>

      {/* Party evolution */}
      {mudouPartido && (
        <div className="flex items-center gap-1 flex-wrap text-xs">
          <span className="text-muted-foreground">Partidos:</span>
          {partidos.map((p, i) => (
            <span key={p}>
              <Badge variant="outline" className="text-[9px] h-5">{p}</Badge>
              {i < partidos.length - 1 && <span className="text-muted-foreground mx-0.5">→</span>}
            </span>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        {historico.map((h, i) => {
          const isCurrentYear = Number(h.ano) === currentAno;
          const votos = Number(h.total_votos || 0);
          return (
            <div
              key={`${h.ano}-${h.sq_candidato}`}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isCurrentYear ? "border-primary/30 bg-primary/5" : "border-border"
              )}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{h.ano}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{h.cargo}</span>
                    <span className="text-xs text-muted-foreground">em {h.municipio}</span>
                    <Badge variant="outline" className="text-[9px] h-5">{h.partido}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  {votos > 0 ? (
                    <div>
                      <div className="text-sm font-bold text-slate-900 font-mono">{votos.toLocaleString('pt-BR')}</div>
                      <div className="text-[10px] text-muted-foreground">votos</div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                {h.situacao && (
                  <Badge className={cn("text-[9px] h-5 border", getSitColor(h.situacao))}>{h.situacao}</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// PATRIMONY (COLLAPSIBLE)
// ═══════════════════════════════════════════════════════

function PatrimonioSection({ bens, patrimonioTotal }: { bens: AnyRow[]; patrimonioTotal: number }) {
  const [aberto, setAberto] = useState(false);

  return (
    <section className="bg-white rounded-xl border border-border p-4">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Building2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">Patrimônio Declarado</h3>
        <Badge variant="outline" className="text-[10px] ml-1">
          {bens.length} {bens.length === 1 ? 'bem' : 'bens'}
        </Badge>
        {patrimonioTotal > 0 && (
          <Badge className="bg-primary/10 text-primary text-[10px] ml-1">{formatBRL(patrimonioTotal)}</Badge>
        )}
        <span className="ml-auto">
          {aberto ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </span>
      </button>

      {aberto && (
        <div className="mt-3">
          {!bens.length ? (
            <p className="text-sm text-muted-foreground">Nenhum bem declarado.</p>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] text-slate-500">#</TableHead>
                    <TableHead className="text-[10px] text-slate-500">Tipo</TableHead>
                    <TableHead className="text-[10px] text-slate-500">Descrição</TableHead>
                    <TableHead className="text-[10px] text-slate-500 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bens.map((r, i) => (
                    <TableRow key={i} className="border-border/30">
                      <TableCell className="text-xs text-slate-400 font-mono">{i + 1}</TableCell>
                      <TableCell className="text-xs text-slate-600">{r.tipo || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-900 max-w-[300px] truncate" title={r.descricao}>{r.descricao || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-900 text-right font-mono font-semibold">
                        {r.valor ? formatBRL(Number(r.valor)) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// FINANCES
// ═══════════════════════════════════════════════════════

function FinancesSection({ receitas }: { receitas: AnyRow[] }) {
  if (!receitas.length) return null;

  const totalReceitas = useMemo(
    () => receitas.reduce((s, r) => {
      const vk = pickKey(r, ['vr_receita', 'valor_receita', 'valor', 'VR_RECEITA']);
      const v = vk ? Number(String(r[vk]).replace(',', '.')) : 0;
      return s + (Number.isFinite(v) ? v : 0);
    }, 0),
    [receitas],
  );

  return (
    <section className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Coins className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">Receitas de Campanha</h3>
        <Badge className="bg-primary/10 text-primary text-[10px]">
          {formatBRL(totalReceitas)} total
        </Badge>
        <Badge variant="outline" className="text-[10px]">{receitas.length} doações</Badge>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] text-slate-500">Doador</TableHead>
              <TableHead className="text-[10px] text-slate-500">Origem</TableHead>
              <TableHead className="text-[10px] text-slate-500 text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receitas.slice(0, 100).map((r, i) => {
              const dk = pickKey(r, ['nm_doador', 'doador', 'nome_doador', 'NM_DOADOR']);
              const ok = pickKey(r, ['ds_origem_receita', 'origem', 'DS_ORIGEM_RECEITA']);
              const vk = pickKey(r, ['vr_receita', 'valor_receita', 'valor', 'VR_RECEITA']);
              const val = vk ? Number(String(r[vk]).replace(',', '.')) : 0;
              return (
                <TableRow key={i} className="border-border/30">
                  <TableCell className="text-sm text-slate-900">{dk ? r[dk] : '—'}</TableCell>
                  <TableCell className="text-xs text-slate-500">{ok ? r[ok] : '—'}</TableCell>
                  <TableCell className="text-sm text-slate-900 text-right font-mono font-semibold">
                    {Number.isFinite(val) && val > 0 ? formatBRL(val) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// SOCIAL NETWORKS
// ═══════════════════════════════════════════════════════

function RedesSociaisSection({ redes }: { redes: AnyRow[] }) {
  if (!redes.length) return null;

  return (
    <section className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ExternalLink className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">Redes Sociais</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {redes.map((r, i) => {
          const urlKey = pickKey(r, ['ds_url', 'url', 'DS_URL']);
          const url = urlKey ? String(r[urlKey]) : '';
          return (
            <a
              key={i}
              href={url.startsWith('http') ? url : `https://${url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border p-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-sm text-slate-900 truncate">{url || '—'}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function CandidatoPerfil() {
  const { id } = useParams<{ id: string }>();
  const sq = id || null;
  const { ano, municipio } = useFilterStore();

  const canUseDataset = (dataset: string, year: number) => getAnosDisponiveis(dataset).includes(year);
  const safeTable = (dataset: string, year: number) => {
    if (!canUseDataset(dataset, year)) return null;
    try { return getTableName(dataset, year); } catch { return null; }
  };

  // ── Perfil principal ──
  const candidatoQ = useQuery({
    queryKey: ['md', 'cand', ano, sq],
    enabled: !!sq,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const rows = await mdQuery(sqlPerfilCandidato(ano, { sq: String(sq) }));
      return (rows[0] as AnyRow) || null;
    },
  });

  // ── Patrimônio ──
  const patrimonioQ = useQuery({
    queryKey: ['md', 'patrimonio', ano, sq],
    enabled: !!sq && canUseDataset('bens', ano),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const rows = await mdQuery(sqlPatrimonioCandidato(ano, String(sq)));
      return rows[0] as AnyRow | null;
    },
  });

  const bensQ = useQuery({
    queryKey: ['md', 'bens_lista', ano, sq],
    enabled: !!sq && canUseDataset('bens', ano),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const rows = await mdQuery(sqlBensCandidato(ano, String(sq)));
      return rows as AnyRow[];
    },
  });

  // ── Receitas ──
  const receitasQ = useQuery({
    queryKey: ['md', 'receitas', ano, sq],
    enabled: !!sq && canUseDataset('receitas', ano),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const t = safeTable('receitas', ano);
      if (!t) return [];
      const rows = await mdQuery(`SELECT * FROM ${t} WHERE SQ_CANDIDATO = '${sq}'`);
      return rows as AnyRow[];
    },
  });

  // ── Redes sociais ──
  const redesQ = useQuery({
    queryKey: ['md', 'redes', ano, sq],
    enabled: !!sq && canUseDataset('rede_social', ano),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const t = safeTable('rede_social', ano);
      if (!t) return [];
      const rows = await mdQuery(`SELECT * FROM ${t} WHERE SQ_CANDIDATO = '${sq}'`);
      return rows as AnyRow[];
    },
  });

  // ── Composição de votos ──
  const nrCandidato = candidatoQ.data?.numero || candidatoQ.data?.NR_CANDIDATO || null;
  const mun = municipio || candidatoQ.data?.municipio || 'GOIÂNIA';

  const composicaoQ = useQuery({
    queryKey: ['md', 'composicao', ano, nrCandidato, mun],
    enabled: !!nrCandidato && canUseDataset('boletim_urna', ano),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const rows = await mdQuery(sqlComposicaoVotosCandidato(ano, nrCandidato!, mun));
      return rows as AnyRow[];
    },
  });

  // ── Histórico eleitoral ──
  const candidato = candidatoQ.data;
  const cpf = candidato?.cpf || candidato?.NR_CPF_CANDIDATO || '';

  const historicoQ = useQuery({
    queryKey: ['md', 'historico_votos', cpf],
    enabled: !!cpf && String(cpf).length >= 8,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => mdQuery(sqlHistoricoComVotos(String(cpf))),
  });

  const isLoading = candidatoQ.isLoading;
  const error = candidatoQ.error;

  const nome = candidato?.candidato || candidato?.NM_URNA_CANDIDATO || candidato?.nome_completo || 'Candidato';
  const patrimonioTotal = Number(patrimonioQ.data?.patrimonio_total || 0);
  const bens = bensQ.data || [];
  const receitas = receitasQ.data || [];
  const redes = redesQ.data || [];
  const historico = (historicoQ.data || []) as AnyRow[];
  const composicao = composicaoQ.data || [];

  const idade = calcIdade(candidato?.data_nascimento || candidato?.DT_NASCIMENTO);

  if (isLoading) return <ProfileSkeleton />;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6 rounded-xl border border-border bg-white text-sm text-red-600">
        Erro ao carregar perfil: {(error as Error).message}
      </div>
    );
  }

  if (!candidato) {
    return (
      <div className="max-w-5xl mx-auto p-10 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Candidato não encontrado.</p>
        <Link to="/candidatos"><Button variant="outline" size="sm"><ArrowLeft className="w-3.5 h-3.5 mr-1" />Voltar</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Link to="/candidatos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos Candidatos
      </Link>

      {/* ══════ HEADER / PROFILE CARD ══════ */}
      <section className="bg-white rounded-xl border border-border p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Avatar + name */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">{String(nome)}</h1>
              {candidato.nome_completo && candidato.nome_completo !== nome && (
                <p className="text-xs text-muted-foreground">{candidato.nome_completo}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-primary text-primary-foreground text-xs">{candidato.partido}</Badge>
                <span className="text-xs font-mono text-muted-foreground">Nº {candidato.numero}</span>
                <span className="text-xs text-muted-foreground">{candidato.cargo}</span>
                {candidato.municipio && <span className="text-xs text-muted-foreground">• {candidato.municipio}</span>}
              </div>
              {candidato.situacao && (
                <Badge className={cn("text-[10px] mt-1 border", getSitColor(candidato.situacao))}>{candidato.situacao}</Badge>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="flex items-center gap-3 flex-wrap md:ml-auto">
            {patrimonioTotal > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-slate-50">
                <Landmark className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Patrimônio</div>
                  <div className="text-sm font-bold text-slate-900">{formatBRL(patrimonioTotal)}</div>
                </div>
              </div>
            )}
            {bens.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-slate-50">
                <Award className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Bens</div>
                  <div className="text-sm font-bold text-slate-900">{bens.length}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personal details grid */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {candidato.genero && <InfoField label="Gênero" value={candidato.genero} />}
          {idade && <InfoField label="Idade" value={`${idade} anos`} />}
          {candidato.escolaridade && <InfoField label="Escolaridade" value={candidato.escolaridade} icon={<GraduationCap className="w-3 h-3" />} />}
          {candidato.ocupacao && <InfoField label="Profissão" value={candidato.ocupacao} />}
          {candidato.estado_civil && <InfoField label="Estado Civil" value={candidato.estado_civil} />}
          {candidato.cor_raca && <InfoField label="Cor/Raça" value={candidato.cor_raca} />}
          {candidato.uf_nascimento && <InfoField label="Naturalidade" value={candidato.uf_nascimento} />}
          {candidato.situacao_candidatura && <InfoField label="Situação da Candidatura" value={candidato.situacao_candidatura} />}
          {candidato.nome_partido && <InfoField label="Partido" value={candidato.nome_partido} />}
        </div>
      </section>

      {/* ══════ COMPOSIÇÃO DE VOTOS ══════ */}
      <VoteCompositionSection
        composicaoRows={composicao}
        isLoading={composicaoQ.isLoading}
        nrCandidato={nrCandidato}
        ano={ano}
      />

      {/* ══════ HISTÓRICO ELEITORAL ══════ */}
      <HistoricoEleitoral historico={historico} currentAno={ano} />

      {/* ══════ PATRIMÔNIO (COLAPSÁVEL) ══════ */}
      <PatrimonioSection bens={bens} patrimonioTotal={patrimonioTotal} />

      {/* ══════ FINANÇAS ══════ */}
      <FinancesSection receitas={receitas} />

      {/* ══════ REDES SOCIAIS ══════ */}
      <RedesSociaisSection redes={redes} />
    </div>
  );
}

function InfoField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
        {icon}{label}
      </div>
      <div className="text-sm text-slate-900 font-medium truncate">{value}</div>
    </div>
  );
}
