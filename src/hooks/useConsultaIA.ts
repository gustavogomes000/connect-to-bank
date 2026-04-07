import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sql_gerado?: string;
  loading?: boolean;
}

let msgCounter = 0;
function genId() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

function parseErroAmigavel(msg: string): string {
  if (msg.includes('429') || msg.includes('RATE_LIMIT') || msg.includes('quota'))
    return 'O sistema está processando muitas solicitações. Aguarde alguns segundos e tente novamente.';
  if (msg.includes('402'))
    return 'Serviço temporariamente indisponível. Tente novamente mais tarde.';
  if (msg.includes('timeout') || msg.includes('TIMEOUT'))
    return 'A consulta demorou mais do que o esperado. Tente simplificar a pergunta.';
  if (msg.includes('MOTHERDUCK') || msg.includes('connection'))
    return 'Erro de conexão com o banco de dados. Tente novamente em alguns instantes.';
  return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
}

export function useConsultaIA() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const lastRequestRef = useRef(0);
  const COOLDOWN_MS = 4500;

  const consultar = useCallback(async (pergunta: string) => {
    const trimmed = pergunta.trim();
    if (!trimmed || loading) return;

    // Cooldown
    const timeSinceLast = Date.now() - lastRequestRef.current;
    if (timeSinceLast < COOLDOWN_MS && lastRequestRef.current > 0) {
      await new Promise(r => setTimeout(r, COOLDOWN_MS - timeSinceLast));
    }

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
    lastRequestRef.current = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('bd-eleicoes-consulta-ia', {
        body: { pergunta: trimmed },
      });

      if (error) throw new Error(error.message);
      if (data?.erro && !data?.sucesso) throw new Error(data.erro);

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: data.resposta || 'Consulta realizada com sucesso.',
                sql_gerado: data.sql_gerado,
                loading: false,
              }
            : m
        )
      );
    } catch (e: any) {
      const friendlyMsg = parseErroAmigavel(e.message || '');
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: friendlyMsg, loading: false }
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

  return { messages, loading, consultar, limpar };
}
