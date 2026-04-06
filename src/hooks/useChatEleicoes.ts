import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  resultado?: ChatResultado | null;
  loading?: boolean;
}

export interface ChatResultado {
  sucesso: boolean;
  tipo_grafico: 'bar' | 'pie' | 'line' | 'area' | 'table' | 'kpi';
  titulo: string;
  descricao: string;
  resposta_texto: string;
  colunas: string[];
  dados: Record<string, any>[];
  sql_gerado?: string;
  intent?: string;
  entities_encontradas?: Record<string, any>;
  erro?: string;
}

let msgCounter = 0;
function genId() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

export function useChatEleicoes() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const enviar = useCallback(async (pergunta: string) => {
    const trimmed = pergunta.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantId = genId();
    const loadingMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('bd-eleicoes-chat', {
        body: { pergunta: trimmed },
      });

      if (error) throw new Error(error.message);
      if (data?.erro && !data?.sucesso) throw new Error(data.erro);

      const resultado = data as ChatResultado;

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: resultado.resposta_texto || resultado.descricao || 'Consulta realizada.',
                resultado,
                loading: false,
              }
            : m
        )
      );
    } catch (e: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: `❌ ${e.message || 'Erro ao processar consulta'}`,
                loading: false,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const limpar = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, enviar, limpar };
}
