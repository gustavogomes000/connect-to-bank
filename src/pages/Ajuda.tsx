import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: 'Como importar os dados?',
    a: 'Vá em "Importar Dados", clique em "Importar Tudo" e aguarde. O processo baixa os dados do TSE automaticamente.',
  },
  {
    q: 'De onde vêm os dados?',
    a: 'Portal de Dados Abertos do TSE (dadosabertos.tse.jus.br). Dados oficiais, públicos e gratuitos.',
  },
  {
    q: 'Quais eleições estão disponíveis?',
    a: '2018 (Federal/Estadual), 2020 (Municipal), 2022 (Federal/Estadual), 2024 (Municipal).',
  },
  {
    q: 'Por que alguns candidatos não têm foto?',
    a: 'Nem todos os candidatos enviaram foto ao TSE. Nesses casos exibimos o avatar com a inicial do nome.',
  },
];

export default function Ajuda() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold">Ajuda</h1>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl border px-5">
            <AccordionTrigger className="text-left font-medium hover:no-underline">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
