import { reddit, redis } from '@devvit/web/server';

export const createPost = async (prompt: string) => {
  const post = await reddit.submitCustomPost({
    title: 'Crowd vs Cloud — Can you tell human from AI?',
  });

  await Promise.all([
    redis.set(`${post.id}:prompt`, prompt),
    redis.set(`${post.id}:phase`, 'submit'),
    redis.set(`${post.id}:answers`, JSON.stringify([])),
  ]);

  return post;
};
