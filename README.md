# Spotify Album Bracket Generator Backend

The Spotify album bracket generator is a web application that allows a user to login with their Spotify account, which allows the application to use the Spotify API to retrieve the user's saved albums, and generate single elimination tournament brackets using them. This repository contains the source code to the backend of this application, which uses Express, PostgreSQL, and the Prisma ORM. 

## Features

- Automatically retrieves the user's saved albums on Spotify with the Spotify API, which will be used as contestants in generated tournament brackets
- Uses the `gemini-2.0-flash-lite` model of the Gemini API to allow the user to specify a theme or constraint to selected albums when creating a new tournament
- Allows the user to select winners of each tournament round, and automatically saves changes in the PostgreSQL database

## Environment Setup

The `template.env` file describes the environment variables needed for the application to run. Copy this file, rename the copy to `.env`, and fill in the environment variables.