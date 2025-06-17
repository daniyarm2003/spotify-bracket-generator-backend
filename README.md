# Spotify Album Bracket Generator Backend 🎶🏆

This backend powers a web app that lets users log in with Spotify, fetch their saved albums, and generate single-elimination tournament brackets. Built with Express, PostgreSQL, and Prisma ORM.

## Features ✨

- Authenticates users via Spotify OAuth and retrieves their saved albums as bracket contestants.
- Integrates Gemini API (`gemini-2.0-flash-lite` model) to let users apply themes or constraints to album selection.
- Enables users to select round winners, with results automatically saved to PostgreSQL.

## Setup ⚙️

1. Copy `template.env` to `.env` and fill in required environment variables.
2. Obtain your **Spotify API credentials** (Client ID and Client Secret) from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications).
3. Obtain your **Gemini API key** from the [Google AI Studio](https://aistudio.google.com/app/apikey).
4. Add these credentials to your `.env` file.
5. Run `npm install` to install dependencies.
6. Run `npx prisma generate` to generate Prisma client code.
7. For development, run `npx prisma db push` to sync the database schema.

> **Note:** In development mode, the app runs on `http://127.0.0.1` (not `localhost`) due to Spotify OAuth redirect URI requirements. Make sure to set your Spotify app's redirect URI to use `127.0.0.1`.

## Scripts 📝

- `npm run dev`: Start the app in development mode with auto-reload.
- `npm run build`: Compile TypeScript to the `build` directory.
- `npm start`: Run the compiled app.
- `npm run clean`: Removes the `build` directory.