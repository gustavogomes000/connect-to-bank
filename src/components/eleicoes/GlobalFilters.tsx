import { useFilterStore } from '@/stores/filterStore';
import { useMunicipios, usePartidos } from '@/hooks/useEleicoes';
import { ANOS_DISPONIVEIS, CARGOS_DISPONIVEIS } from '@/lib/eleicoes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function GlobalFilters() {
  const { ano, turno, cargo, municipio, partido, setAno, setTurno, setCargo, setMunicipio, setPartido, limpar } = useFilterStore();
  const { data: municipios } = useMunicipios();
  const { data: partidos } = usePartidos();

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 py-3">
      <div className="flex flex-wrap gap-3 items-center max-w-[1400px] mx-auto">
        <Select value={ano?.toString() || 'todos'} onValueChange={(v) => setAno(v === 'todos' ? null : parseInt(v))}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os anos</SelectItem>
            {ANOS_DISPONIVEIS.map((a) => (
              <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={turno?.toString() || 'todos'} onValueChange={(v) => setTurno(v === 'todos' ? null : parseInt(v))}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Turno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Ambos turnos</SelectItem>
            <SelectItem value="1">1º Turno</SelectItem>
            <SelectItem value="2">2º Turno</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cargo || 'todos'} onValueChange={(v) => setCargo(v === 'todos' ? null : v)}>
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os cargos</SelectItem>
            {CARGOS_DISPONIVEIS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={municipio || 'todos'} onValueChange={(v) => setMunicipio(v === 'todos' ? null : v)}>
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <SelectValue placeholder="Município" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos municípios</SelectItem>
            {(municipios || []).map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={partido || 'todos'} onValueChange={(v) => setPartido(v === 'todos' ? null : v)}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Partido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos partidos</SelectItem>
            {(partidos || []).map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={limpar} className="h-9 text-muted-foreground">
          <X className="w-4 h-4 mr-1" /> Limpar
        </Button>
      </div>
    </div>
  );
}
