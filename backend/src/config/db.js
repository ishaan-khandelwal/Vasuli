const mongoose = require('mongoose');

const connectToDatabase = async () => {
  const { MONGO_URI, MONGO_DB_NAME } = process.env;

  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not set. Add it to backend/.env before starting the server.');
  }

  const options = {};
  if (MONGO_DB_NAME) {
    options.dbName = MONGO_DB_NAME;
  }

  await mongoose.connect(MONGO_URI, options);

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected on ${host}/${name}`);
};

module.exports = { connectToDatabase };
