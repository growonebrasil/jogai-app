import { AppLayout } from "@/components/AppLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Como criar uma nova pelada?",
    answer:
      "Vá até a seção 'Minhas Peladas' e clique no botão 'Nova Pelada'. Preencha as informações como nome, local, data e horário. Depois é só convidar os jogadores!",
  },
  {
    question: "Como funciona o sistema de times?",
    answer:
      "Os times são gerados automaticamente com base no overall e posição dos jogadores confirmados. O algoritmo busca equilibrar as equipes para partidas mais competitivas. Você também pode editar os times manualmente.",
  },
  {
    question: "Como adicionar um convidado?",
    answer:
      "Na página da pelada, clique em 'Convidar' e selecione 'Adicionar Convidado'. Informe o nome e posição do convidado. Ele poderá participar normalmente da partida e depois você pode convertê-lo em usuário.",
  },
  {
    question: "Como funciona a votação pós-jogo?",
    answer:
      "Após o término da partida, cada jogador deve votar em todos os outros participantes com uma nota de 0 a 5 estrelas. O relatório completo só fica disponível após todos votarem ou após 24 horas.",
  },
  {
    question: "O que é o Overall do jogador?",
    answer:
      "O Overall é a média geral das habilidades do jogador. Ele é calculado a partir da auto-avaliação inicial e evolui com base nas votações recebidas nas partidas e no comportamento (cartões).",
  },
  {
    question: "Como funciona o financeiro?",
    answer:
      "No módulo financeiro você pode controlar pagamentos de mensalistas e diaristas, além de registrar despesas como goleiro, juiz, bolas e aluguel da quadra. Tudo organizado para facilitar a gestão.",
  },
];

export default function Ajuda() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground">Central de Ajuda</h1>
          <p className="text-muted-foreground mt-2">
            Encontre respostas para suas dúvidas sobre o JOGA.I.
          </p>
        </div>

        {/* FAQ */}
        <div className="bg-card rounded-xl border border-border p-5 md:p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-lg px-4 bg-secondary/30"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-medium text-foreground">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact */}
        <div className="bg-gradient-card rounded-xl border border-border p-5 md:p-6 text-center">
          <h2 className="font-display text-xl font-bold text-foreground mb-2">
            Ainda precisa de ajuda?
          </h2>
          <p className="text-muted-foreground mb-4">
            Entre em contato com nossa equipe de suporte.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline">
              <Mail className="w-4 h-4" />
              suporte@jogai.com.br
            </Button>
            <Button>
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
