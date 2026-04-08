import { useState, useRef, useEffect } from 'react';
import { useFilterStore } from '@/store/filterStore';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatEleicoes() {
  const ano = useFilterStore(state => state.ano);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu **Assistente Sarelli Inteligência**. \nEstou integrado à base de dados de **Logística e Finanças**.\n\nComo posso ajudar? Exemplos:\n- *Quais são as lideranças da escola X?*\n- *Quais são os maiores doadores neste setor?*'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: userMessage, ano })
      });

      if (!res.ok) throw new Error('Falha na comunicação com nosso Data Warehouse.');
      
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.resposta }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Falha técnica:** ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto rounded-3xl overflow-hidden border border-border shadow-sm bg-white">
      <div className="bg-white/80 backdrop-blur-md p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#EC4899]/10 p-2 rounded-lg border border-[#EC4899]/20">
            <Sparkles className="w-5 h-5 text-[#EC4899]" />
          </div>
          <div>
            <h2 className="text-slate-900 font-bold tracking-wide">Assistente Estratégico AI</h2>
            <p className="text-[10px] text-[#EC4899] font-mono leading-none mt-1">Sarelli Inteligência Eleitoral</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-3 py-1.5 bg-[#EC4899]/10 text-[#EC4899] rounded-full border border-[#EC4899]/30 uppercase tracking-wider flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#EC4899] animate-pulse" />
          MotherDuck + Vector Search
        </span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#c026d3] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-[#EC4899]/10 text-slate-900 rounded-br-sm border border-[#EC4899]/20 font-medium' 
                : 'bg-white text-slate-900 rounded-bl-sm border border-border shadow-sm'
            }`}>
              <div className="text-[10px] mb-2 opacity-70 font-bold uppercase tracking-wider flex items-center gap-1.5">
                {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-[#EC4899]" />}
                {msg.role === 'user' ? 'Você' : 'Sarelli AI'}
              </div>
              
              <div className="prose prose-sm md:prose-base prose-p:leading-relaxed prose-headings:text-[#EC4899] prose-a:text-[#EC4899] max-w-none 
                prose-table:border-collapse prose-table:w-full prose-table:text-sm prose-th:bg-[#EC4899]/10 prose-th:p-2 prose-th:text-left prose-th:border-b prose-th:border-border 
                prose-td:p-2 prose-td:border-b prose-td:border-border prose-strong:text-slate-900 prose-strong:font-bold prose-ul:list-disc prose-ul:pl-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-border">
                <User className="w-5 h-5 text-slate-500" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 md:gap-4 justify-start animate-in fade-in">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#c026d3] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-white rounded-bl-sm border border-border max-w-[200px]">
              <div className="flex space-x-2 items-center h-full">
                <div className="w-2 h-2 bg-[#EC4899] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-[#EC4899] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-[#EC4899] rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/70 backdrop-blur-xl border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center mx-auto w-full group">
          <input
            type="text"
            className="w-full bg-white border border-border focus:border-[#EC4899]/50 focus:ring-1 focus:ring-[#EC4899]/30 text-slate-900 placeholder-slate-400 rounded-full py-4 pl-6 pr-16 outline-none transition-all duration-300"
            placeholder="Pergunte sobre setores eleitorais, lideranças ou finanças..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-[#EC4899] to-[#c026d3] flex items-center justify-center text-white disabled:opacity-50 disabled:grayscale hover:scale-105 transition-all duration-200 shadow-lg shadow-[#EC4899]/20"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-500 mt-3 font-mono">
          As consultas geram SQL Zero-IA validadas executadas em alta-performance no <span className="text-[#EC4899]">MotherDuck</span>.
        </p>
      </div>
    </div>
  );
}
