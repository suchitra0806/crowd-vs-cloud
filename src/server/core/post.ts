import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'Crowd vs Cloud — Can you tell human from AI?',
  });
};
