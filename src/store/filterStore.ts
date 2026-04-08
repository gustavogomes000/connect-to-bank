import { create } from 'zustand';

interface FilterState {
  ano: number;
  municipio: string | null;
  cargo: string | null;
  zona: string | null;
  bairro: string | null;
  escola: string | null;

  setAno: (ano: number) => void;
  setMunicipio: (municipio: string | null) => void;
  setCargo: (cargo: string | null) => void;
  setZona: (zona: string | null) => void;
  setBairro: (bairro: string | null) => void;
  setEscola: (escola: string | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  ano: 2024,
  municipio: null,
  cargo: null,
  zona: null,
  bairro: null,
  escola: null,

  setAno: (ano) => set({ ano }),
  
  // Lógica de cascata geográfica: ao alterar o município, zera os níveis inferiores
  setMunicipio: (municipio) => set({ 
    municipio, 
    zona: null, 
    bairro: null, 
    escola: null 
  }),
  
  setCargo: (cargo) => set({ cargo }),
  
  // Ao alterar a zona, zera bairro e escola
  setZona: (zona) => set({ 
    zona, 
    bairro: null, 
    escola: null 
  }),
  
  // Ao alterar o bairro, zera a escola
  setBairro: (bairro) => set({ 
    bairro, 
    escola: null 
  }),
  
  setEscola: (escola) => set({ escola }),

  resetFilters: () => set({
    ano: 2024,
    municipio: null,
    cargo: null,
    zona: null,
    bairro: null,
    escola: null,
  })
}));
