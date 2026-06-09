import mongoose from "mongoose";

const RETRY_MS = 5000;

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDatabase() {
  const DBURL = process.env.DB_URL;
  if (!DBURL) {
    console.error("DB_URL is not set in environment");
    return false;
  }

  try {
    await mongoose.connect(DBURL, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    return false;
  }
}

export function startDatabaseRetryLoop() {
  const retry = async () => {
    if (!isDatabaseConnected()) {
      await connectDatabase();
    }
  };

  retry();
  return setInterval(retry, RETRY_MS);
}
