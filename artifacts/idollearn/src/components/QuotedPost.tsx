import type { Post } from "@/types";

interface QuotedPostProps {
  retweeted_text: NonNullable<Post["retweeted_text"]>;
  retweeted_author: Post["retweeted_author"];
  retweeted_url: Post["retweeted_url"];
  retweeted_translation?: Post["retweeted_translation"];
}

export default function QuotedPost({
  retweeted_text,
  retweeted_author,
  retweeted_url,
  retweeted_translation,
}: QuotedPostProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-1.5">
      {retweeted_author && (
        <p className="text-xs font-semibold text-gray-500">
          {retweeted_url ? (
            <a
              href={retweeted_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-[#01696f]"
            >
              {retweeted_author}
            </a>
          ) : (
            retweeted_author
          )}
        </p>
      )}
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-japanese">
        {retweeted_text}
      </p>
      {retweeted_translation && (
        <p className="text-sm text-[#01696f] leading-relaxed border-t border-gray-200 pt-1.5">
          {retweeted_translation}
        </p>
      )}
    </div>
  );
}
