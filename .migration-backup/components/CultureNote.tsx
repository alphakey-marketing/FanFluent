import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CultureNoteProps {
  notes: string;
}

export default function CultureNote({ notes }: CultureNoteProps) {
  return (
    <div className="rounded-xl border border-gray-200">
      <Accordion type="single" collapsible>
        <AccordionItem value="culture" className="border-none">
          <AccordionTrigger className="px-4 text-sm font-semibold text-[#01696f]">
            🎌 文化背景
          </AccordionTrigger>
          <AccordionContent className="px-4 text-sm text-gray-700 leading-relaxed">
            {notes}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
