export type PromptModule = 'code' | 'math' | 'writing' | 'research' | 'general';

export function detectModules(userMessage: string): PromptModule[] {
  const text = userMessage.toLowerCase();
  const modules: PromptModule[] = ['general'];

  if (/code|debug|program|function|api|component|bug|error|typescript|javascript|python|react|next|css|html|sql/i.test(text)) {
    modules.unshift('code');
  }
  if (/math|calculate|equation|formula|solve|algebra|calculus|statistics|probability/i.test(text)) {
    modules.unshift('math');
  }
  if (/write|draft|essay|blog|article|content|copy|email|letter|story|creative/i.test(text)) {
    modules.unshift('writing');
  }
  if (/research|analyze|compare|review|study|investigate|evaluate/i.test(text)) {
    modules.unshift('research');
  }

  return [...new Set(modules)];
}

export function buildSystemPrompt(modules: PromptModule[], hasSearchResults: boolean): string {
  const core = `You are AI Verse — an intelligent AI assistant created by Lokesh.

CAPABILITIES: Code, Math, Writing, Research, Analysis, General Knowledge.

RULES:
- Detect user's language. Reply in that language only.
- Be concise for simple questions, thorough for complex ones.
- Use markdown code blocks with language tags for code.
- Never guess. If unsure, say so honestly.
- If the topic may be outdated, indicate that.
- Think before responding. Reasoning first, then answer.`;

  const codeModule = `
CODE EXPERTISE:
- TypeScript, JavaScript, React, Next.js, Python, C++, Java, SQL, Rust, Go
- Debug systematically: identify error → find cause → provide fix
- Include working code examples with comments.
- Follow modern best practices and patterns.`;

  const mathModule = `
MATH MODE:
- Show step-by-step solutions.
- Explain reasoning at each step.
- Use clear notation.
- Verify your answer.`;

  const writingModule = `
WRITING MODE:
- Adapt tone to context (formal/casual/technical).
- Structure with clear headings and paragraphs.
- Be concise but complete.
- Fix grammar and improve clarity when editing.`;

  const researchModule = `
RESEARCH MODE:
- Analyze multiple perspectives.
- Cite reasoning and evidence.
- Present structured comparisons.
- Highlight key findings.`;

  const searchContext = hasSearchResults
    ? `\n\nIMPORTANT: Current information has been retrieved for this question. Use the provided search results to answer accurately. Cite sources when relevant.`
    : '';

  let prompt = core;

  if (modules.includes('code')) prompt += codeModule;
  if (modules.includes('math')) prompt += mathModule;
  if (modules.includes('writing')) prompt += writingModule;
  if (modules.includes('research')) prompt += researchModule;

  prompt += searchContext;

  return prompt;
}

export function compressConversation(messages: { role: string; content: string }[]): { role: string; content: string }[] {
  if (messages.length <= 10) return messages;

  const recent = messages.slice(-6);
  const older = messages.slice(0, -6);

  const summary = older
    .map(m => `${m.role}: ${m.content.slice(0, 100)}`)
    .join('\n');

  return [
    { role: 'system', content: `Previous conversation summary:\n${summary}` },
    ...recent,
  ];
}
