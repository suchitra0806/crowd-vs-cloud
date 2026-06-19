import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';
import { advanceToResults, advanceToVote, getPhase } from '../core/game';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();
    return c.json<UiResponse>(
      { navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}` },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

menu.post('/advance-to-vote', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<UiResponse>({ showToast: 'No post context' }, 400);

  try {
    const phase = await getPhase(postId);
    if (phase !== 'submit') {
      return c.json<UiResponse>({ showToast: `Already past submit phase (current: ${phase})` }, 400);
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
