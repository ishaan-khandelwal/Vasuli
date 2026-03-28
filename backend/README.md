# Vasuli Backend

## Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Add your MongoDB connection string to `MONGO_URI`.
3. Set a strong `JWT_SECRET`.
4. Copy `.env.example` to `.env` in the project root if you want to override the frontend API URL.

## Run

Start the backend:

```bash
npm run backend:dev
```

Start the Expo app in a separate terminal:

```bash
npm start
```

## API URL notes

- Web and iOS simulator can usually use `http://localhost:5000/api`.
- Android emulator can usually use `http://10.0.2.2:5000/api`.
- A physical phone must use your computer's local network IP, for example `http://192.168.1.20:5000/api`.
