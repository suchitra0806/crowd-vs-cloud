import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  buildLeaderboard,
  getAllVotes,
  getAnswers,
  getPhase,
  getPrompt,
  setAllVotes,
  setAnswers,
} from '../core/game';
import { PROMPTS } from '../../shared/prompts';
import type {
  AnswerForResults,
  AnswerForVote,
  ErrorResponse,
  GameInitResponse,
  GamePreviewResponse,
  SubmitAnswerResponse,
  VoteResponse,
} from '../../shared/api';

type ErrResp = ErrorResponse;

export const api = new Hono();

async function ensureInit(postId: string): Promise<string> {
  let prompt = await getPrompt(postId);
  if (!prompt) {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    prompt = PROMPTS[dayIndex % PROMPTS.length] ?? PROMPTS[0]!;
    await Promise.all([
      redis.set(`${postId}:prompt`, prompt),
      redis.set(`${postId}:phase`, 'submit'),
      redis.set(`${postId}:answers`, JSON.stringify([])),
    ]);
  }
  return prompt;
}

api.get('/game/preview', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<ErrResp>({ status: 'error', message: 'Missing postId' }, 400);
  try {
    const [prompt, phase, answers] = await Promise.all([
      ensureInit(postId),
      getPhase(postId),
      getAnswers(postId),
    ]);
    return c.json<GamePreviewResponse>({
      type: 'game_preview',
      phase,
      prompt,
      answerCount: answers.length,
    });
  } catch (e) {
    console.error('Preview error:', e);
    return c.json<ErrResp>({ status: 'error', message: 'Failed to load preview' }, 500);
  }
});

api.get('/game/init', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<ErrResp>({ status: 'error', message: 'Missing postId' }, 400);

  try {
    const [prompt, username] = await Promise.all([
      ensureInit(postId),
      reddit.getCurrentUsername(),
    ]);

    const [phase, answers] = await Promise.all([
      getPhase(postId),
      getAnswers(postId),
    ]);

    const userId = context.userId ?? 'anonymous';

    const [userAnswerId, userVotedRaw, userVotesRaw] = await Promise.all([
      redis.get(`${postId}:user_answer:${userId}`),
      redis.get(`${postId}:user_voted:${userId}`),
      redis.get(`${postId}:user_votes:${userId}`),
    ]);

    const userHasSubmitted = !!userAnswerId;
    const userAnswer = userAnswerId ? answers.find((a) => a.id === userAnswerId) : undefined;
    const userHasVoted = !!userVotedRaw;
    const userVotes: Record<string, 'human' | 'ai'> | undefined = userHasVoted && userVotesRaw
      ? (JSON.parse(userVotesRaw) as Record<string, 'human' | 'ai'>)
      : undefined;

    const base: GameInitResponse = {
      type: 'game_init',
      postId,
      phase,
      prompt,
      username: username ?? 'anonymous',
      answerCount: answers.length,
      userHasSubmitted,
      userAnswerText: userAnswer?.text,
      userHasVoted,
      userVotes,
    };

    if (phase === 'submit') return c.json<GameInitResponse>(base);

    if (phase === 'vote') {
      const answersForVote: AnswerForVote[] = answers.map((a) => ({ id: a.id, text: a.text }));
      return c.json<GameInitResponse>({ ...base, answers: answersForVote });
    }

    // results phase
    const [allVotes, scoresRaw] = await Promise.all([
      getAllVotes(postId),
      redis.get(`${postId}:scores`),
    ]);

    const scores: Record<string, number> = scoresRaw
      ? (JSON.parse(scoresRaw) as Record<string, number>)
      : {};

    const revealedAnswers: AnswerForResults[] = answers.map((a) => {
      const votes = Object.values(allVotes.byAnswer[a.id] ?? {});
      return {
        id: a.id,
        text: a.text,
        isAI: a.isAI,
        authorUsername: a.isAI ? null : a.authorUsername,
        humanVoteCount: votes.filter((v) => v === 'human').length,
        aiVoteCount: votes.filter((v) => v === 'ai').length,
      };
    });

    return c.json<GameInitResponse>({
      ...base,
      revealedAnswers,
      userScore: scores[username ?? ''] ?? 0,
      leaderboard: buildLeaderboard(scores),
    });
  } catch (e) {
    console.error('Game init error:', e);
    return c.json<ErrResp>({ status: 'error', message: 'Failed to load game' }, 500);
  }
});

api.post('/game/submit', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<ErrResp>({ status: 'error', message: 'Missing postId' }, 400);

  try {
    const phase = await getPhase(postId);
    if (phase !== 'submit') {
      return c.json<ErrResp>({ status: 'error', message: 'Submission phase is over' }, 400);
    }

    const userId = context.userId;
    if (!userId) return c.json<ErrResp>({ status: 'error', message: 'Must be logged in' }, 401);

    if (await redis.get(`${postId}:user_answer:${userId}`)) {
      return c.json<ErrResp>({ status: 'error', message: 'You already submitted an answer' }, 400);
    }

    const body = await c.req.json<{ text: string }>();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 120) {
      return c.json<ErrResp>({ status: 'error', message: 'Answer must be 1–120 characters' }, 400);
    }

    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const answerId = `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const answers = await getAnswers(postId);
    answers.push({ id: answerId, text, isAI: false, authorId: userId, authorUsername: username });

    await Promise.all([
      setAnswers(postId, answers),
      redis.set(`${postId}:user_answer:${userId}`, answerId),
    ]);

    return c.json<SubmitAnswerResponse>({
      type: 'submit_answer',
      success: true,
      answerCount: answers.length,
    });
  } catch (e) {
    console.error('Submit error:', e);
    return c.json<ErrResp>({ status: 'error', message: 'Failed to submit' }, 500);
  }
});

api.post('/game/vote', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<ErrResp>({ status: 'error', message: 'Missing postId' }, 400);

  try {
    const phase = await getPhase(postId);
    if (phase !== 'vote') {
      return c.json<ErrResp>({ status: 'error', message: 'Not in voting phase' }, 400);
    }

    const userId = context.userId;
    if (!userId) return c.json<ErrResp>({ status: 'error', message: 'Must be logged in' }, 401);

    if (await redis.get(`${postId}:user_voted:${userId}`)) {
      return c.json<ErrResp>({ status: 'error', message: 'Already voted' }, 400);
    }

    const body = await c.req.json<{ votes: Record<string, 'human' | 'ai'> }>();
    const { votes } = body;
    if (!votes || typeof votes !== 'object') {
      return c.json<ErrResp>({ status: 'error', message: 'Invalid votes payload' }, 400);
    }

    const username = (await reddit.getCurrentUsername()) ?? userId;
    const allVotes = await getAllVotes(postId);

    for (const [answerId, vote] of Object.entries(votes)) {
      if (!allVotes.byAnswer[answerId]) allVotes.byAnswer[answerId] = {};
      allVotes.byAnswer[answerId][userId] = vote;
    }
    allVotes.voterNames[userId] = username;

    await Promise.all([
      setAllVotes(postId, allVotes),
      redis.set(`${postId}:user_votes:${userId}`, JSON.stringify(votes)),
      redis.set(`${postId}:user_voted:${userId}`, '1'),
    ]);

    return c.json<VoteResponse>({ type: 'vote', success: true });
  } catch (e) {
    console.error('Vote error:', e);
    return c.json<ErrResp>({ status: 'error', message: 'Failed to submit votes' }, 500);
  }
});
