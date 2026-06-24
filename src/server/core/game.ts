import { redis } from '@devvit/web/server';
import { generateAIAnswers } from './claude';
import type { GamePhase, LeaderboardEntry } from '../../shared/api';

export type StoredAnswer = {
  id: string;
  text: string;
  isAI: boolean;
  authorId: string;
  authorUsername: string;
};

export type AllVotes = {
  byAnswer: Record<string, Record<string, 'human' | 'ai'>>;
  voterNames: Record<string, string>;
};

const k = (postId: string, suffix: string) => `${postId}:${suffix}`;

export async function getPhase(postId: string): Promise<GamePhase> {
  return ((await redis.get(k(postId, 'phase'))) as GamePhase) ?? 'submit';
}

export async function getPrompt(postId: string): Promise<string> {
  return (await redis.get(k(postId, 'prompt'))) ?? '';
}

export async function getAnswers(postId: string): Promise<StoredAnswer[]> {
  const raw = await redis.get(k(postId, 'answers'));
  return raw ? (JSON.parse(raw) as StoredAnswer[]) : [];
}

export async function getAllVotes(postId: string): Promise<AllVotes> {
  const raw = await redis.get(k(postId, 'all_votes'));
  return raw ? (JSON.parse(raw) as AllVotes) : { byAnswer: {}, voterNames: {} };
}

export async function setAnswers(postId: string, answers: StoredAnswer[]): Promise<void> {
  await redis.set(k(postId, 'answers'), JSON.stringify(answers));
}

export async function setAllVotes(postId: string, allVotes: AllVotes): Promise<void> {
  await redis.set(k(postId, 'all_votes'), JSON.stringify(allVotes));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

const FALLBACK_AI_ANSWERS = [
  'a suspiciously warm doorknob',
  'the concept of a tuesday',
  'someone else\'s regret, laminated',
];

export async function advanceToVote(postId: string): Promise<string | null> {
  const [answers, prompt] = await Promise.all([
    getAnswers(postId),
    getPrompt(postId),
  ]);

  let aiTexts: string[];
  let warning: string | null = null;
  try {
    aiTexts = await generateAIAnswers(prompt, answers.map((a) => a.text));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warning = msg.includes('not configured')
      ? 'API key not set — used placeholder answers. Run: npx devvit settings set ANTHROPIC_API_KEY'
      : 'Claude unavailable — used placeholder answers.';
    console.error('AI generation failed, using fallbacks:', e);
    aiTexts = FALLBACK_AI_ANSWERS;
  }

  const aiAnswers: StoredAnswer[] = aiTexts.map((text, i) => ({
    id: `ai_${Date.now()}_${i}`,
    text,
    isAI: true,
    authorId: 'ai',
    authorUsername: 'AI',
  }));

  const mixed = shuffle([...answers, ...aiAnswers]);
  await Promise.all([
    redis.set(k(postId, 'answers'), JSON.stringify(mixed)),
    redis.set(k(postId, 'phase'), 'vote'),
  ]);
  return warning;
}

export async function advanceToResults(postId: string): Promise<void> {
  const [answers, allVotes] = await Promise.all([
    getAnswers(postId),
    getAllVotes(postId),
  ]);

  const scores: Record<string, number> = {};

  for (const answer of answers) {
    const votersOnThis = allVotes.byAnswer[answer.id] ?? {};

    for (const [voterId, vote] of Object.entries(votersOnThis)) {
      const voterName = allVotes.voterNames[voterId] ?? voterId;
      const correct = vote === 'ai' ? answer.isAI : !answer.isAI;

      if (correct) {
        scores[voterName] = (scores[voterName] ?? 0) + 1;
      }

      if (!answer.isAI && vote === 'ai' && answer.authorId !== voterId) {
        scores[answer.authorUsername] = (scores[answer.authorUsername] ?? 0) + 2;
      }
    }
  }

  await Promise.all([
    redis.set(k(postId, 'scores'), JSON.stringify(scores)),
    redis.set(k(postId, 'phase'), 'results'),
  ]);
}

export async function resetGame(postId: string, newPrompt: string): Promise<void> {
  const [answers, allVotes] = await Promise.all([
    getAnswers(postId),
    getAllVotes(postId),
  ]);

  const authorIds = answers.filter((a) => !a.isAI).map((a) => a.authorId);
  const voterIds = Object.keys(allVotes.voterNames);
  const participantIds = [...new Set([...authorIds, ...voterIds])];

  const perUserKeys = participantIds.flatMap((uid) => [
    k(postId, `user_answer:${uid}`),
    k(postId, `user_voted:${uid}`),
    k(postId, `user_votes:${uid}`),
  ]);

  await Promise.all([
    redis.set(k(postId, 'prompt'), newPrompt),
    redis.set(k(postId, 'phase'), 'submit'),
    redis.set(k(postId, 'answers'), JSON.stringify([])),
    redis.del(k(postId, 'all_votes')),
    redis.del(k(postId, 'scores')),
    ...perUserKeys.map((key) => redis.del(key)),
  ]);
}

export function buildLeaderboard(scores: Record<string, number>): LeaderboardEntry[] {
  return Object.entries(scores)
    .map(([username, score]) => ({ username, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
