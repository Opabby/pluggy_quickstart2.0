import { PluggyClient } from 'pluggy-sdk';

export const getPluggyClient = () => {
  if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
    throw new Error('Missing Pluggy credentials');
  }

  return new PluggyClient({
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET,
  });
};

export const hasPluggyCredentials = (): boolean => {
  return !!(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
};