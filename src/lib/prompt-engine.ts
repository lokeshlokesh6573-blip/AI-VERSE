export function improvePrompt(userMessage: string): string {
  const text = userMessage.trim();

  // Already good — don't rewrite
  if (isWellStructured(text)) return text;

  // Very short/ vague — expand
  if (text.length < 15 && !hasQuestionMark(text)) {
    return expandVaguePrompt(text);
  }

  // Code request without language — add context
  if (isCodeRequest(text) && !hasLanguageHint(text)) {
    return `${text}. Use TypeScript with modern best practices.`;
  }

  return text;
}

function isWellStructured(text: string): boolean {
  return (
    text.length > 50 ||
    text.includes('?') ||
    text.includes('```') ||
    text.startsWith('How') ||
    text.startsWith('What') ||
    text.startsWith('Why') ||
    text.startsWith('Can') ||
    text.startsWith('Write') ||
    text.startsWith('Create') ||
    text.startsWith('Debug') ||
    text.startsWith('Explain') ||
    text.startsWith('Help')
  );
}

function hasQuestionMark(text: string): boolean {
  return text.includes('?');
}

function expandVaguePrompt(text: string): string {
  const lower = text.toLowerCase();

  const expansions: Record<string, string> = {
    'help': 'Help me with a software development task.',
    'code': 'Write clean, well-documented code with modern best practices.',
    'fix': 'Debug and fix the issue in my code.',
    'explain': 'Explain this concept clearly with examples.',
    'build': 'Help me build this feature step by step.',
    'error': 'I have an error. Help me debug it.',
    'api': 'Help me integrate with this API.',
    'design': 'Help me design the architecture for this.',
    'optimize': 'Optimize this code for performance and readability.',
  };

  for (const [key, expansion] of Object.entries(expansions)) {
    if (lower === key || lower === `${key} this` || lower === `${key} it`) {
      return expansion;
    }
  }

  return text;
}

function isCodeRequest(text: string): boolean {
  return /write|create|build|code|function|component|fix|debug/i.test(text);
}

function hasLanguageHint(text: string): boolean {
  return /typescript|javascript|python|java|rust|go|css|html|sql|react|next|vue/i.test(text);
}
