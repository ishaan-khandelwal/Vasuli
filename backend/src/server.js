require('dotenv').config();

const app = require('./app');
const { connectToDatabase } = require('./config/db');

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await connectToDatabase();

    app.listen(port, '0.0.0.0', () => {
      console.log(`Vasuli backend listening on  http://localhost:${port}/api`);
    });
  } catch (error) {
    console.error('Failed to start backend server.');
    console.error(error);
    process.exit(1);
  }
};

startServer();
