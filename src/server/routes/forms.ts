import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';

export const forms = new Hono();

forms.post('/create-game', async (c) => {
  const body = await c.req.json<{ prompt?: string }>();
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

  if (!prompt) {
    return c.json<UiResponse>({ showToast: 'A prompt is required' }, 400);
  }

  try {
    const post = await createPost(prompt);
    return c.json<UiResponse>({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (e) {
    console.error('Create game error:', e);
    return c.json<UiResponse>({ showToast: 'Failed to create game' }, 400);
  }
});
