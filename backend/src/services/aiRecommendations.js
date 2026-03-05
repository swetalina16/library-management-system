const OpenAI = require('openai');

// Client is created lazily so the app still starts if no API key is set
let openai;
function getClient() {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

/**
 * Ask OpenAI to pick 3 books from `candidates` that are most similar to `book`.
 *
 * @param {object} book       - The book the user selected (id, title, author, genre)
 * @param {object[]} candidates - Other books to choose from (max ~20 kept in the route)
 * @returns {Promise<object[]>} Up to 3 recommended book objects
 */
async function getAIRecommendations(book, candidates) {
  // Silently return nothing if the API key is not configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    return [];
  }

  if (candidates.length === 0) return [];

  // Build a numbered list so the AI can reference books by ID
  const candidateList = candidates
    .map((b) => `${b.id}: "${b.title}" by ${b.author} (${b.genre}, ${b.published_year || 'n/a'})`)
    .join('\n');

  const prompt =
    `You are a librarian. A reader just picked:\n` +
    `"${book.title}" by ${book.author} — ${book.genre}, ${book.published_year || 'n/a'}\n\n` +
    `From the list below, choose the 3 books they would enjoy most.\n` +
    `Reply with ONLY a JSON array of those 3 book IDs, e.g. [4, 12, 7]. No other text.\n\n` +
    `Books:\n${candidateList}`;

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 60,
    temperature: 0.4,
  });

  const text = response.choices[0].message.content.trim();

  // Extract a JSON array from the response (handles extra text defensively)
  const match = text.match(/\[[\d,\s]+\]/);
  if (!match) return [];

  const ids = JSON.parse(match[0]);
  return candidates.filter((b) => ids.includes(b.id)).slice(0, 3);
}

module.exports = { getAIRecommendations };
