import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import type { Form } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { advanceToResults, advanceToVote, getAnswers, getPhase } from '../core/game';

export const menu = new Hono();

const CREATE_GAME_FORM: Form = {
  title: 'Create a new game',
  fields: [
    {
      type: 'paragraph',
      name: 'prompt',
      label: 'Prompt',
      helpText: 'The question players will answer — e.g. "Name something you\'d find in a wizard\'s pocket"',
      required: true,
    },
  ],
  acceptLabel: 'Create game',
};

menu.post('/post-create', async (c) => {
  return c.json<UiResponse>({
    showForm: {
      name: 'create-game',
      form: CREATE_GAME_FORM,
    },
  });
});

menu.post('/advance-to-vote', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<UiResponse>({ showToast: 'No post context' }, 400);

  try {
    const [phase, answers] = await Promise.all([getPhase(postId), getAnswers(postId)]);
    if (phase !== 'submit') {
      return c.json<UiResponse>({ showToast: `Already past submit phase (current: ${phase})` }, 400);
    }
    const humanAnswers = answers.filter((a) => !a.isAI);
    if (humanAnswers.length === 0) {
      return c.json<UiResponse>({ showToast: 'Need at least 1 human answer before voting can start' }, 400);
    }
    await advanceToVote(postId);
    return c.json<UiResponse>({ showToast: '✅ Voting phase started! AI answers injected.' });
  } catch (e) {
    console.error('Advance to vote error:', e);
    return c.json<UiResponse>({ showToast: 'Failed to start voting phase' }, 400);
  }
});

menu.post('/advance-to-results', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<UiResponse>({ showToast: 'No post context' }, 400);

  try {
    const phase = await getPhase(postId);
    if (phase !== 'vote') {
      return c.json<UiResponse>({ showToast: `Not in vote phase (current: ${phase})` }, 400);
    }
    await advanceToResults(postId);
    return c.json<UiResponse>({ showToast: '🏆 Results revealed! Scores calculated.' });
  } catch (e) {
    console.error('Advance to results error:', e);
    return c.json<UiResponse>({ showToast: 'Failed to reveal results' }, 400);
  }
});
