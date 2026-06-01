import type { VocabItem } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VocabBreakdownProps {
  vocab: VocabItem[];
}

export default function VocabBreakdown({ vocab }: VocabBreakdownProps) {
  if (!vocab || vocab.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-[#01696f]/5 border-b border-gray-200">
        <h3 className="font-semibold text-[#01696f] text-sm">📖 詞彙解析</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">單字</TableHead>
              <TableHead className="w-24">假名</TableHead>
              <TableHead className="w-24">羅馬字</TableHead>
              <TableHead>中文意思</TableHead>
              <TableHead className="hidden md:table-cell">詞性</TableHead>
              <TableHead className="hidden lg:table-cell">語源</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vocab.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-japanese font-medium text-base">
                  {item.word}
                </TableCell>
                <TableCell className="font-japanese text-gray-600">
                  {item.reading}
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                  {item.romaji}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-gray-900">{item.meaning_zh}</p>
                    <p className="text-xs text-gray-400">{item.meaning_en}</p>
                  </div>
                  {item.usage_note && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      {item.usage_note}
                    </p>
                  )}
                  {item.example_sentence && (
                    <p className="text-xs text-[#01696f] mt-1 font-japanese">
                      例：{item.example_sentence}
                    </p>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-gray-500">
                  {item.word_type}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-gray-500">
                  {item.origin}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
