import { useState } from 'react';
import { useEscolas, useEscolaPessoal } from '@/hooks/useEscolas';
import { GlobalFilters } from '@/components/eleicoes/GlobalFilters';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Building2, MapPin, Search, Users } from 'lucide-react';

const LiderancaList = ({ zona, secao }: { zona: number; secao: string }) => {
  const { data, isLoading, isError } = useEscolaPessoal(zona, secao);

  if (isLoading) return <div className="p-3"><Skeleton className="h-4 w-48 mb-2" /><Skeleton className="h-4 w-32" /></div>;
  if (isError) return <div className="p-3 text-xs text-destructive">Erro ao carregar mapa de lideranças.</div>;
  if (!data?.dados.length) return <div className="p-3 text-xs text-muted-foreground">Nenhum apoio mapeado para esta seção.</div>;

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <div className="flex items-center gap-2 mb-2 px-2">
        <Users className="w-3 h-3 text-accent" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Lideranças de Campo/Apoio
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {data.dados.map((lid, idx) => (
              <tr key={idx} className="border-b border-border/20 last:border-0 hover:bg-primary/5 transition-colors">
                <td className="px-2 py-2 font-bold uppercase text-primary">{lid.lideranca}</td>
                <td className="px-2 py-2 text-xs text-muted-foreground text-right">{lid.funcao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function EscolasEleitorais() {
  const { data, isLoading, isError, error } = useEscolas();
  const [busca, setBusca] = useState('');
  const [expandedSecao, setExpandedSecao] = useState<{escola: string, secao: string} | null>(null);

  const escolasFiltradas = data?.dados.filter((escola) => 
    escola.escola.toLowerCase().includes(busca.toLowerCase()) || 
    escola.setor?.toLowerCase().includes(busca.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-2">
      <GlobalFilters />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Logística de Escolas Eleitorais</h2>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por escola ou setor..." 
            className="pl-9 bg-muted/50 border-border/50"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar escolas</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border/50 p-4 h-32 flex flex-col justify-between">
              <Skeleton className="h-5 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {escolasFiltradas.length === 0 && !isLoading && (
            <div className="col-span-full p-8 text-center text-muted-foreground bg-card rounded-xl border border-border/50">
              Nenhuma escola eleitoral encontrada com os filtros atuais.
            </div>
          )}
          
          {escolasFiltradas.map((escola, idx) => (
            <div key={idx} className="bg-card rounded-xl border border-border/50 p-4 shadow-sm flex flex-col">
              <div className="mb-2">
                <h3 className="text-sm font-bold leading-tight uppercase text-foreground">{escola.escola}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Setor: {escola.setor || 'Não informado'}</span>
                  <span className="mx-1">•</span>
                  <span>Zona {escola.zona}</span>
                </div>
              </div>
              
              <div className="mt-auto pt-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Seções ({escola.qtd_secoes}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(escola.secoes || '').split(',').map(sec => {
                    const secaoText = sec.trim();
                    if (!secaoText) return null;
                    const isActive = expandedSecao?.escola === escola.escola && expandedSecao?.secao === secaoText;
                    
                    return (
                      <Badge 
                        key={secaoText} 
                        variant={isActive ? "default" : "secondary"}
                        className="cursor-pointer hover:bg-primary/80 transition-colors text-xs font-mono"
                        onClick={() => 
                          setExpandedSecao(isActive ? null : { escola: escola.escola, secao: secaoText })
                        }
                      >
                        {secaoText}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {expandedSecao?.escola === escola.escola && (
                <LiderancaList zona={escola.zona} secao={expandedSecao.secao} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
