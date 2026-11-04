import { topicSections, wikipediaArticleURL, type Article } from "@/lib/encyclopedia-data";
import type { Flag, Source } from "@/lib/types";

type Props = {
  article: Article | null;
  title: string;
  chapters: { id: string; title: string; pattern: RegExp }[];
  dataSources: Source[];
  flag?: Flag | null;
};

export function ProfileReferences({ article, title, chapters, dataSources, flag }: Props) {
  const image = article?.image;

  return <details className="panel tool-panel profile-references" id="references">
    <summary><h2>References</h2><span>Article, data, and image credits</span></summary>
    <div className="reference-groups">
      <div>
        <h3>Encyclopedia</h3>
        {article ? <>
          <p>Excerpts from <a href={article.revisionUrl}>Wikipedia contributors · {article.revisionDate.slice(0, 10)}</a> · <a href={article.licenseUrl}>{article.license}</a>. Excerpts omit references and formatting. Figures in the article may use different reference years than the statistical cards.</p>
          <p><a href={article.url}>Read the current article</a></p>
          {chapters.map((chapter) => {
            const topics = topicSections(article, chapter.pattern);
            if (!topics.length) return null;
            return <div key={chapter.id}><h4>{chapter.title}</h4>
              <ul className="article-topics">{topics.map((topic) => <li key={topic.anchor}><a href={`${article.revisionUrl}#${encodeURIComponent(topic.anchor)}`}>{topic.name}</a></li>)}</ul>
            </div>;
          })}
        </> : <p>Introductory excerpt from <a href={wikipediaArticleURL(title)}>Wikipedia contributors</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p>}
      </div>
      {dataSources.length > 0 && <div><h3>Data sources</h3><ul>{dataSources.map((source) => <li key={source.name}><a href={source.url}>{source.name}</a> · {source.vintage}</li>)}</ul></div>}
      {(image || flag) && <div><h3>Image credits</h3>
        {image && <p><a href={image.source}>{image.title}</a> · {image.author} · {image.licenseUrl ? <a href={image.licenseUrl}>{image.license}</a> : image.license}</p>}
        {flag && <p><a href={flag.source}>{flag.title.replace(/^File:/, "")}</a>{flag.author ? ` · ${flag.author}` : ""} · {flag.licenseUrl ? <a href={flag.licenseUrl}>{flag.license}</a> : flag.license} · {flag.modification}</p>}
      </div>}
    </div>
  </details>;
}
