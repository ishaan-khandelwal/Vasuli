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

## Security configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | **Yes in production** (>= 32 chars) | Signs login tokens. The server refuses to start in production without it. |
| `ADMIN_API_KEY` | No (>= 32 chars) | Enables `/api/admin/*`. Send it as the `x-admin-key` header. Admin routes return 404 when unset. |
| `CORS_ORIGINS` | No | Comma-separated browser origins allowed to call the API. Native apps are unaffected. |
| `BLOB_READ_WRITE_TOKEN` | Yes in production | Proof-image storage (Vercel Blob). |

Generate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Built-in protections: helmet headers, per-IP rate limits, account lockout after 5 failed logins (15 min),
token revocation (`POST /api/auth/logout-all`), strict input validation/sanitising of stored app data,
magic-byte checks and random file names for uploads, and generic 5xx error messages.

## Automatic SMS reminders (Android)

Settings -> "Auto-Send SMS Reminders" sends reminder SMS from the phone's SIM at the reminder time, using
a plan stored on the device (no internet needed at send time). It only texts people who owe the signed-in
user, at most once per person per day, 25 per run and 60 per day. Requires a native Android build
(`npx expo prebuild` applies `plugins/withAutoSms.js`); it is not available in Expo Go, web or iOS.
