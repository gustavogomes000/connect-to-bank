import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useImportLogs } from '@/hooks/useEleicoes';
import { formatDate, formatNumber, ANOS_DISPONIVEIS } from '@/lib/eleicoes';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/eleicoes/Skeletons';
import { Rocket, Trash2, Download, RefreshCw, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const TIPOS = ['candidatos', 'votacao', 'comparecimento'] as const;
type Tipo = typeof TIPOS[number];
type Status = 'idle' | 'importing' | 'done' | 'error';

interface CellState {
  status: Status;
  count?: number;
  error?: string;
  finishedAt?: string;
}

export default function ImportarDados() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: logs, isLoading: loadingLogs } = useImportLogs();

  const [cells, setCells] = useState<Record<string, CellState>>({});

  const getKey = (ano: number, tipo: Tipo) => `${ano}-${tipo}`;
  const getCell = (ano: number, tipo: Tipo): CellState => cells[getKey(ano, tipo)] || { status: 'idle' };

  const importar = async (ano: number, tipo: Tipo) => {
    const key = getKey(ano, tipo);
    setCells((prev) => ({ ...prev, [key]: { status: 'importing' } }));

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await supabase.functions.invoke('bd-eleicoes-importar', {
        body: { ano, tipo },
      });

      if (res.error) throw new Error(res.error.message);
      const data = res.data;

      if (data?.sucesso) {
        setCells((prev) => ({
          ...prev,
          [key]: { status: 'done', count: data.total_registros, finishedAt: new Date().toISOString() },
        }));
        toast({ title: 'Importação concluída', description: `${formatNumber(data.total_registros)} registros de ${tipo} ${ano}` });
      } else {
        throw new Error(data?.erro || 'Erro desconhecido');
      }
    } catch (err: any) {
      setCells((prev) => ({ ...prev, [key]: { status: 'error', error: err.message } }));
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    }

    queryClient.invalidateQueries({ queryKey: ['importLogs'] });
    queryClient.invalidateQueries({ queryKey: ['checkEmpty'] });
  };

  const importarTudo = async () => {
    for (const ano of ANOS_DISPONIVEIS) {
      for (const tipo of TIPOS) {
        await importar(ano, tipo);
      }
    }
  };

  const limparBase = async () => {
    try {
      for (const tipo of TIPOS) {
        const tableName = `bd_eleicoes_${tipo}` as any;
        await (supabase.from(tableName) as any).delete().gte('id', 0);
      }
      setCells({});
      queryClient.invalidateQueries();
      toast({ title: 'Base limpa', description: 'Todos os dados eleitorais foram removidos.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const tipoLabels: Record<Tipo, { icon: string; label: string }> = {
    candidatos: { icon: '👤', label: 'Candidatos' },
    votacao: { icon: '🗳️', label: 'Votação' },
    comparecimento: { icon: '📊', label: 'Comparecimento' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importação de Dados Eleitorais</h1>
        <p className="text-muted-foreground mt-1">TSE → Supabase | Base de Dados Eleições | Goiás</p>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Os dados são baixados diretamente do Portal de Dados Abertos do TSE (dadosabertos.tse.jus.br),
          filtrados para o estado de Goiás e inseridos no banco. O processo pode levar alguns minutos por arquivo.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={importarTudo} size="lg">
          <Rocket className="w-5 h-5 mr-2" />
          Importar Tudo
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg">
              <Trash2 className="w-5 h-5 mr-2" />
              Limpar Base de Dados
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar base de dados?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza? Esta ação apagará TODOS os dados eleitorais importados.
                As demais tabelas do banco não serão afetadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={limparBase} className="bg-destructive text-destructive-foreground">
                Sim, apagar tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Import Grid */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Ano</th>
                {TIPOS.map((t) => (
                  <th key={t} className="px-4 py-3 text-center font-medium">
                    {tipoLabels[t].icon} {tipoLabels[t].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ANOS_DISPONIVEIS.map((ano) => (
                <tr key={ano} className="border-b last:border-0">
                  <td className="px-4 py-4 font-bold text-lg">{ano}</td>
                  {TIPOS.map((tipo) => {
                    const cell = getCell(ano, tipo);
                    return (
                      <td key={tipo} className="px-4 py-4 text-center">
                        {cell.status === 'idle' && (
                          <Button size="sm" onClick={() => importar(ano, tipo)}>
                            <Download className="w-4 h-4 mr-1" /> Importar
                          </Button>
                        )}
                        {cell.status === 'importing' && (
                          <div className="flex flex-col items-center gap-1">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">Importando...</span>
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                            </div>
                          </div>
                        )}
                        {cell.status === 'done' && (
                          <div className="flex flex-col items-center gap-1">
                            <CheckCircle className="w-5 h-5 text-[hsl(var(--success))]" />
                            <span className="text-xs font-medium">{formatNumber(cell.count)} registros</span>
                            <span className="text-xs text-muted-foreground">{cell.finishedAt ? formatDate(cell.finishedAt) : ''}</span>
                            <button
                              className="text-xs text-primary hover:underline mt-1"
                              onClick={() => importar(ano, tipo)}
                            >
                              Reimportar
                            </button>
                          </div>
                        )}
                        {cell.status === 'error' && (
                          <div className="flex flex-col items-center gap-1">
                            <XCircle className="w-5 h-5 text-destructive" />
                            <span className="text-xs text-destructive">Erro</span>
                            <button
                              className="text-xs text-primary hover:underline"
                              onClick={() => importar(ano, tipo)}
                            >
                              Tentar novamente
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log */}
      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-base font-semibold mb-4">Log de Importações</h3>
        {loadingLogs ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-striped">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Data/Hora</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Ano</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Registros</th>
                </tr>
              </thead>
              <tbody>
                {(logs || []).map((log: any) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2">{formatDate(log.created_at)}</td>
                    <td className="py-2 capitalize">{log.tipo}</td>
                    <td className="py-2">{log.ano}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'sucesso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2">{formatNumber(log.registros_inseridos || log.total_registros)}</td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Nenhuma importação realizada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
