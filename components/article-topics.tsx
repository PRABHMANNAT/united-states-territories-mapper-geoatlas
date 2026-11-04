import { ExternalLink } from "lucide-react";
import { topicSections, type Article } from "@/lib/encyclopedia-data";

export function ArticleTopics({ article, pattern }: { article: Article; pattern: RegExp }) {
  const sections = topicSections(article, pattern);
  if (!sections.length) return null;
  const excerpts = article.summaries?.filter((item) => sections.some((section) => section.name === item.name)).slice(0, 3) ?? [];
  return <><div className="chapter-reading">{excerpts.map((item) => <article key={item.name}><h3>{item.name}</h3>{item.text.split("\n\n").slice(0, 2).map((text, index) => <p key={index}>{text}</p>)}</article>)}</div>{excerpts.length > 0 && <p className="source-line">Excerpts from <a href={article.revisionUrl}>Wikipedia contributors · {article.revisionDate.slice(0, 10)}</a> · <a href={article.licenseUrl}>{article.license}</a>. Historical context from the linked revision; figures may use different reference years than the statistical cards. References and formatting omitted.</p>}<ul className="article-topics">{sections.map((item) => <li key={item.anchor}><a href={`${article.revisionUrl}#${encodeURIComponent(item.anchor)}`}>{item.name} <ExternalLink size={12}/></a></li>)}</ul></>;
}
