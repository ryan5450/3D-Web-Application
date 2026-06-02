# Requirements

## Runtime

- Node.js 20 or newer
- npm
- MongoDB Atlas cluster or another MongoDB connection string

## Environment

Create `.env.local` in the project root after cloning. Do not commit real secrets.

```env
MONGODB_URI=your_mongodb_connection_string
SESSION_PASSWORD=your_random_session_secret_32_chars_or_longer
```

`MONGODB_URI` connects the app to MongoDB.

`SESSION_PASSWORD` encrypts the login session cookie. Changing it logs users out.

## Install And Run

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run start
```
