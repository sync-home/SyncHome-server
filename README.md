# [SyncHome](https://synchome.vercel.app)
### [SyncHome Client](https://github.com/sync-home/SyncHome)

## Smart Residential Building Management System
SyncHome is a Smart Residential Building Management System designed for efficient building management and enhanced living experiences.

## Packages Used

- `mongodb`: To manage data in documents format we used mongodb@6.3.0.
- `dotenv`: To secure our environment variables, we used dotenv@16.3.2.
- `cors`: For CORS, or Cross-Origin Resource Sharing, we used cors@2.8.5.
- `cookie-parser`: To pass cookie like user credentials, we used cookie-parser@1.4.6.
- `jsonwebtoken`: To secure our users data, we used jwt or jsonwebtoken@9.0.2.
- `express`: To make scalable app and create api we used nodejs framework express@4.18.2.

and more. your can see our [package.json](./package.json) for details.

## Installation

### Clone the repository

```bash
git clone https://github.com/sync-home/SyncHome-server.git
```

### install dependencies and all used packages

if you didn't install `node` in your machine, install first from [here](https://nodejs.org)

```bash
cd SyncHome-server
npm i
```

### Environment Variables

The environment variable files should be named as `.env` only.
Here the env variables are as below (put them with your own corresponding values in .env file):

### MongoDB

- `URI`: uri of the mongodb with your `username`, `password` and `database name`
- `DB_NAME`: your database name

### JWT
- `ACCESS_TOKEN_SECRET`

### Usage

First of all install `nodemon` globally.
After setting all, to start the development server:

```bash
npm start
```

This will run the application in development mode. Open [http://localhost:5000](http://localhost:5000) to view it in your browser.

## Project Structure

- `index.js`: all api endpoints are in this file.

### Development Workflow

1. **Directory for Development:**

   - Developers will work with only the `index.js` file.

2. **Branching Strategy:**

   - Feature/Bugfix branches will be created from the `main` branch.
   - Branch names should be simple and short. Avoid including sprint data (date, project name, etc.).

3. **Pull Requests:**

   - After being satisfied with the changes, developers will create a PR to the `stage` branch (after deployment, tester will start testing).
   - The lead will review code changes and merge/close the PR.
   - Every single feature/bugfix branch will be deleted after a PR.

4. **ReadMe Edits:**

   - Only lead/Maintainer/operations-team will edit the primary README. 

5. **Dockerfile:**
   - Always run the Dockerfile locally before creating a PR to the development branch.
   - Before starting to code, make sure to pull the development branch.
   - Before pushing code to GitHub, make sure to pull the `stage` branch.

#### Primary Branches:

- `main`
- `stage`

#### Secondary/Feature/Bugfix Branches:

- Feature: `feature/feature_name`
- Bugfix: `bugfix/name`

#### Commit Messages:

- `[post](notification): add Eid notification`


## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
