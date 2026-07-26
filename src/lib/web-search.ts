interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export async function webSearch(query: string, numResults: number = 5): Promise<string> {
  try {
    // DuckDuckGo instant answer API — free, no key needed
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = await res.json();

    const results: SearchResult[] = [];

    // Abstract (main answer)
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        link: data.AbstractURL || '',
      });
    }

    // Related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= numResults) break;
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.slice(0, 80),
            snippet: topic.Text,
            link: topic.FirstURL,
          });
        }
        // Handle sub-topics
        if (topic.Topics && Array.isArray(topic.Topics)) {
          for (const sub of topic.Topics) {
            if (results.length >= numResults) break;
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: sub.Text.slice(0, 80),
                snippet: sub.Text,
                link: sub.FirstURL,
              });
            }
          }
        }
      }
    }

    // Answer box
    if (data.Answer) {
      results.unshift({
        title: 'Answer',
        snippet: data.Answer,
        link: '',
      });
    }

    if (results.length === 0) return '';

    return results
      .slice(0, numResults)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}${r.link ? `\nSource: ${r.link}` : ''}`)
      .join('\n\n');
  } catch (error) {
    console.error('Web search error:', error);
    return '';
  }
}

export function needsWebSearch(userMessage: string): boolean {
  const text = userMessage.toLowerCase();

  const currentInfoPatterns = [
    /latest|recent|current|today|now|2024|2025|2026|2027/,
    /what( is| are) (the )?(latest|new|recent|current)/,
    /who (is|are) (the )?(current|new|latest)/,
    /what( is| are) (the )?(best|top|popular) .*(in|of|for) 202/,
    /news|update|announce|release|launch/,
    /price|cost|stock|market/,
    /weather|temperature/,
    /score|result|winner|champion/,
    /version|release date|when (did|was|will)/,
    /compare .*(vs|versus|or) .*(2024|2025|2026)/,
  ];

  const techPatterns = [
    /(?:best|top|new|latest) (?:ai|ml|llm|model|framework|library|tool|language|database|api)/,
    /(?:react|nextjs|next\.js|vue|angular|svelte|node|python|rust|go|java) (?:\d|v\d|version)/,
    /(?:openai|google|anthropic|meta|microsoft|apple) (?:new|latest|release|announce)/,
    /(?:gpt|claude|gemini|llama|mistral|copilot) (?:\d|v\d|latest|new)/,
  ];

  return currentInfoPatterns.some(p => p.test(text)) ||
         techPatterns.some(p => p.test(text));
}
