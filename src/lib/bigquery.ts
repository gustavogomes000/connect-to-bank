import { supabase } from '@/integrations/supabase/client';

const FUNCTION_NAME = 'bd-eleicoes-bigquery';

export interface BQTabela {
  nome: string;
  linhas: string;
  tamanho_mb: string;
}

export interface BQColuna {
  column_name: string;
  data_type: string;
}

export interface BQQueryParams {
  tabela: string;
  filtros?: Record<string, string>;
  colunas?: string[];
  limite?: number;
  offset?: number;
  ordenar?: string;
  ordem?: 'ASC' | 'DESC';
  busca?: { coluna: string; valor: string };
}

export interface BQQueryResult {
  sucesso: boolean;
  tabela: string;
  colunas: string[];
  linhas: Record<string, string>[];
  total: number;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body });
  if (error) throw new Error(error.message || 'Erro ao chamar BigQuery');
  if (data?.erro) throw new Error(data.erro);
  return data as T;
}

export async function listarTabelas(): Promise<BQTabela[]> {
  const result = await invoke<{ tabelas: BQTabela[] }>({ acao: 'tabelas' });
  return result.tabelas || [];
}

export async function schemaTabela(tabela: string): Promise<BQColuna[]> {
  const result = await invoke<{ colunas: BQColuna[] }>({ acao: 'schema', tabela });
  return result.colunas || [];
}

export async function contarTabela(tabela: string, filtros?: Record<string, string>): Promise<number> {
  const result = await invoke<{ total: number }>({ acao: 'contar', tabela, filtros });
  return result.total;
}

export async function queryTabela(params: BQQueryParams): Promise<BQQueryResult> {
  return invoke<BQQueryResult>(params as unknown as Record<string, unknown>);
}
