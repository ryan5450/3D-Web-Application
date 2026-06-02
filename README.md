# 3D Web Application

A full-stack Next.js 3D scene app with account signup/login, cookie sessions, MongoDB persistence, and draggable Three.js objects.

## Features

- Signup and login UI
- Session-backed authentication
- MongoDB user and scene storage
- 3D room with cube, sphere, cone, torus, and remote GLB model options
- Random object placement
- Mouse dragging on the floor plane
- Visual held-state scale/color feedback
- Save and load scene objects per signed-in user

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/three_scene_app
SESSION_PASSWORD=use-a-random-secret-with-at-least-32-characters
```

3. Start MongoDB locally, then run:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Notes

The custom GLB option uses the public Khronos sample model URL at runtime. The app still works with built-in objects if that network asset is unavailable.
