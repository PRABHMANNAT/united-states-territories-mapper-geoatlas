import { ExternalLink } from "lucide-react";
import { topicSections, type Article } from "@/lib/encyclopedia-data";

export function ArticleTopics({ article, pattern }: { article: Article; pattern: RegExp }) {
  const sections = topicSections(article, pattern);
  if (!sections.length) return null;
  return <ul className="article-topics">{sections.map((item) => <li key={item.anchor}><a href={`${article.revisionUrl}#${encodeURIComponent(item.anchor)}`}>{item.name} <ExternalLink size={12}/></a></li>)}</ul>;
}
