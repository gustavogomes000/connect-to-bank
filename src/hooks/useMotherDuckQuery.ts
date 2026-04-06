import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MotherDuckResult {
  data: any;
  isLoading: boolean;
  error: Error | null;
}

export function useMotherDuckQuery(sql: string, queryKey?: string[]): MotherDuckResult {
  const result = useQuery({
    queryKey: queryKey || ['motherduck', sql],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('query-motherduck', {
        body: { query: sql },
      });

      if (error) throw new Error(error.message || 'Erro ao chamar query-motherduck');
      if (data?.error) throw new Error(data.error);

      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error as Error | null,
  };
}
