import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { env } from './env.js';
export const authMongo = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
export async function connectDatabase() {
  await Promise.all([
    mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }),
    authMongo.connect(),
  ]);
  const hello = await authMongo.db().admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid')
    throw new Error(
      'MongoDB must be a replica set or Atlas cluster: checkout requires transactions. See README.',
    );
}
export async function closeDatabase() {
  await Promise.all([mongoose.disconnect(), authMongo.close()]);
}
