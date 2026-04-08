import { useNavigate } from "react-router-dom";
import { useRanking } from "@/hooks/useRanking";
import { GlobalFilters } from "@/components/eleicoes/GlobalFilters";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { formatNumber, getPartidoCor } from "@/lib/eleicoes";

export default function Ranking() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useRanking();

  // Helper to render a skeleton row (5 columns + position)
  const renderSkeletonRow = (key: number) => (
    <TableRow key={key} className="border-b border-border/20">
      <TableCell className="px-2 py-1.5"><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell className="px-2 py-1.5"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="px-2 py-1.5"><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell className="px-2 py-1.5"><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell className="px-2 py-1.5"><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell className="px-2 py-1.5"><Skeleton className="h-4 w-16" /></TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-2">
      {/* Filters */}
      <GlobalFilters />

      {/* Content */}
      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{(error as Error).message || "Falha ao carregar ranking."}</AlertDescription>
        </Alert>
      )}

      <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm table-auto">
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border/30 text-left">
                <TableHead className="px-2 py-2 w-8 text-[10px] uppercase tracking-wider">#</TableHead>
                <TableHead className="px-2 py-2 text-[10px] uppercase tracking-wider">Nome</TableHead>
                <TableHead className="px-2 py-2 text-[10px] uppercase tracking-wider">Partido</TableHead>
                <TableHead className="px-2 py-2 text-[10px] uppercase tracking-wider">Cargo</TableHead>
                <TableHead className="px-2 py-2 text-[10px] uppercase tracking-wider">Município</TableHead>
                <TableHead className="px-2 py-2 text-[10px] uppercase tracking-wider text-right">Votos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 10 }).map((_, i) => renderSkeletonRow(i))}
              {data && data.dados.map((item, idx) => (
                <TableRow
                  key={item.SQ_CANDIDATO ?? idx}
                  className="border-b border-border/20 hover:bg-primary/5 cursor-pointer transition-colors"
                  onClick={() => navigate(`/candidato/${item.SQ_CANDIDATO}`)}
                >
                  <TableCell className="px-2 py-1.5 text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="px-2 py-1.5 font-medium">{item.NM_CANDIDATO}</TableCell>
                  <TableCell className="px-2 py-1.5 font-semibold" style={{ color: getPartidoCor(item.NM_PARTIDO) }}>{item.NM_PARTIDO}</TableCell>
                  <TableCell className="px-2 py-1.5">{item.DS_CARGO}</TableCell>
                  <TableCell className="px-2 py-1.5 text-muted-foreground">{item.NM_MUNICIPIO_NASCIMENTO}</TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-bold text-primary">
                    {formatNumber(item.total_votos)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
