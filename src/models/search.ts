export interface SearchResult {
  title: string;
  link: string;
  content: string;
  filteredContent?: string;
}

export class SearchResults {
  constructor(public results: SearchResult[]) {}

  public toString(): string {
    return this.results
      .map((result, i) => `[${i + 1}] ${this.formatResult(result)}`)
      .join("\n\n");
  }

  public shortString(): string {
    return this.results
      .map((result, i) => `[${i + 1}] ${this.formatShortResult(result)}`)
      .join("\n\n");
  }

  private formatResult(result: SearchResult): string {
    const title = result.title || 'No Title';
    const link = result.link || 'No Link';
    const rawContentSnippet = result.content ? result.content.substring(0, 1000) : 'No Content';

    if (result.filteredContent) {
      return `Title: ${title}\nLink: ${link}\nRefined Content: ${result.filteredContent}`;
    }
    return `Title: ${title}\nLink: ${link}\nRaw Content: ${rawContentSnippet}`;
  }

  private formatShortResult(result: SearchResult): string {
    const title = result.title || 'No Title';
    const link = result.link || 'No Link';
    const rawContentSnippet = result.content ? result.content.substring(0, 1000) : 'No Content';
    return `Title: ${title}\nLink: ${link}\nRaw Content: ${rawContentSnippet}`;
  }

  public add(other: SearchResults): SearchResults {
    return new SearchResults(this.results.concat(other.results));
  }

  public dedup(): SearchResults {
    const seen = new Set<string>();
    const unique: SearchResult[] = [];

    for (const result of this.results) {
      if (!seen.has(result.link)) {
        seen.add(result.link);
        unique.push(result);
      }
    }

    return new SearchResults(unique);
  }
}
