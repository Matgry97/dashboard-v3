export type NewsCategory = "tech" | "general";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  publishedAt: string | null;
  summary?: string;
  score?: number;
  commentsUrl?: string;
  tags?: string[];
}

export interface NewsSection {
  source: {
    id: string;
    name: string;
    group: "stack" | "headlines";
    homepage: string;
  };
  items: NewsItem[];
  error?: string;
  /** Source is failing; items are the last good fetch (see fetchedAt). */
  stale?: boolean;
  fetchedAt: string;
}

export interface NewsResponse {
  category: NewsCategory;
  sections: NewsSection[];
}
