const API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

export async function generateAIAnswers(prompt: string, humanAnswers: string[]): Promise<string[]> {
  const examples = humanAnswers.slice(0, 5).map((a) => `- ${a}`).join('\n');

  const userMessage = `You are playing a party game. Players were asked: "${prompt}"

${examples ? `Human answers already submitted:\n${examples}\n\n` : ''}Generate exactly 3 SHORT answers (1-8 words each) that sound like genuine human responses — witty, playful, or surprising. Do NOT repeat any existing answer. Do NOT sound robotic or use corporate language.

Return ONLY a JSON array of 3 strings. Example: ["answer one", "answer two", "answer three"]`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: [{ type: string; text: string }];
  };

  const text = data.content[0]?.text ?? '';
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error('No JSON array in Claude response');

  const parsed = JSON.parse(match[0]) as unknown[];
  if (!Array.isArray(parsed) || parsed.length < 1) throw new Error('Invalid array');

  return parsed
    .slice(0, 3)
    .map((x) => String(x).trim())
    .filter(Boolean);
}
