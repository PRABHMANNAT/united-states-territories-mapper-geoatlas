import { topicExcerpts, type Article } from "@/lib/encyclopedia-data";

export function ArticleTopics({ article, pattern }: { article: Article; pattern: RegExp }) {
  const excerpts = topicExcerpts(article, pattern);
  if (!excerpts.length) return null;
  return <div className="chapter-reading">{excerpts.map((item) => <article key={item.name}><h3>{item.name}</h3>{item.text.split("\n\n").slice(0, 2).map((text, index) => <p key={index}>{text}</p>)}</article>)}</div>;
}
