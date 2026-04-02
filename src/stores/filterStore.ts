import { create } from 'zustand';

interface FilterState {
  ano: number | null;
  turno: number | null;
  cargo: string | null;
  municipio: string | null;
  partido: string | null;
  setAno: (ano: number | null) => void;
  setTurno: (turno: number | null) => void;
  setCargo: (cargo: string | null) => void;
  setMunicipio: (municipio: string | null) => void;
  setPartido: (partido: string | null) => void;
  limpar: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  ano: 2024,
  turno: null,
  cargo: null,
  municipio: null,
  partido: null,
  setAno: (ano) => set({ ano }),
  setTurno: (turno) => set({ turno }),
  setCargo: (cargo) => set({ cargo }),
  setMunicipio: (municipio) => set({ municipio }),
  setPartido: (partido) => set({ partido }),
  limpar: () => set({ ano: null, turno: null, cargo: null, municipio: null, partido: null }),
}));
