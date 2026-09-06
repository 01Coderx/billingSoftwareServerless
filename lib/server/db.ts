import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection: Promise<typeof mongoose> | undefined;
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!global.mongooseConnection) {
    global.mongooseConnection = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
  }
  await global.mongooseConnection;
  return mongoose;
}
