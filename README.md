# Tsunami's Twitch VODs

A searchable archive of Tsunami's Twitch streams, hosted as YouTube videos with synchronized chat replay.

## Features

- Search and filter completed games by tag
- Browse multi-part YouTube playlists
- Resume saved playback positions
- Link directly to video timestamps
- Replay synchronized Twitch chat alongside a video
- Manage games, playlists, videos, and chat data through authenticated API endpoints

## Stack

- React 19 and Material UI 9
- Express
- PostgreSQL
- YouTube embedded player API

## Local frontend

Use Node.js 22 LTS (the version in `.nvmrc`), then install dependencies and start the React development server:

```bash
npm install
npm start
```

The app is available at <http://localhost:3000/vods/>. Set `VITE_VODS_API_URL` in `.env` to select the backend API used by the frontend.

## Backend

The API requires PostgreSQL and the environment variables documented in `env.example`.

```bash
npm run migrate
npm run backend:dev
```

The backend listens on `BE_PORT` (default `3001`). Swagger documentation is available at `/api-docs` while the server is running.

Additional backend setup, endpoints, imports, chat utilities, and API-key management are documented in [`backend/README.md`](backend/README.md).

## Useful commands

```bash
npm run build             # Create a production frontend build
npm run migrate:status    # Check database migration status
npm run import-data       # Import a VOD data dump
npm run manage-keys       # Manage backend API keys
```

## License

[MIT](LICENSE)
