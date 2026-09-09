const mongoose = require('mongoose');

let connectionPromise = null;

const connectToDatabase = async () => {
  const { MONGO_URI, MONGO_DB_NAME } = process.env;

  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not set. Add it to backend/.env before starting the server.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const options = {};
  if (MONGO_DB_NAME) {
    options.dbName = MONGO_DB_NAME;
  }

  connectionPromise = mongoose.connect(MONGO_URI, options).catch((error) => {
    connectionPromise = null;
    throw error;
  });

  await connectionPromise;

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected on ${host}/${name}`);

  return mongoose.connection;
};

module.exports = { connectToDatabase };
