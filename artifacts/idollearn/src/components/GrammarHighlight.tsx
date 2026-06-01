import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface GrammarHighlightProps {
  grammarNotes: string;
  languageOrigin: string | null;
}

export default function GrammarHighlight({
  grammarNotes,
  languageOrigin,
}: GrammarHighlightProps) {
  return (
    <div className="rounded-xl border border-gray-200">
      <Accordion type="multiple">
        <AccordionItem value="grammar" className="border-none border-b border-gray-200">
          <AccordionTrigger className="px-4 text-sm font-semibold text-[#01696f]">
            📝 文法解析
          </AccordionTrigger>
          <AccordionContent className="px-4 text-sm text-gray-700 leading-relaxed">
            {grammarNotes}
          </AccordionContent>
        </AccordionItem>
        {languageOrigin && (
          <AccordionItem value="origin" className="border-none">
            <AccordionTrigger className="px-4 text-sm font-semibold text-[#01696f]">
              🔤 語言起源
            </AccordionTrigger>
            <AccordionContent className="px-4 text-sm text-gray-700 leading-relaxed">
              {languageOrigin}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
