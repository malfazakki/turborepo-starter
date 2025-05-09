# Setting Up Turborepo with Next.js and Express.js

This guide walks you through setting up a monorepo using Turborepo that includes a Next.js frontend and an Express.js backend.

## Prerequisites

- Node.js (v16 or newer recommended)
- npm
- Git

## Step 1: Create a New Turborepo Project

First, let's create a new Turborepo project:

```bash
npx create-turbo@latest .
```

When prompted, select:
* Package manager: npm
* Import a workspace configuration: No

## Step 2: Modify the Project Structure

Remove the default apps that were created:

```bash
rm -rf apps/web apps/docs
```

## Step 3: Create the Next.js App

Create a new Next.js application in the apps directory:

```bash
cd apps && npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

This command creates a Next.js app with:
- TypeScript support
- Tailwind CSS integration
- ESLint configuration
- App Router (Next.js 13+)
- Source directory structure
- Import alias configuration

## Step 4: Create the Express.js Backend

Create a directory for your Express.js API and initialize it:

```bash
mkdir -p apps/api && cd apps/api && npm init -y
```

## Step 5: Install Express.js Dependencies

Install necessary dependencies for your Express.js API:

```bash
cd apps/api && npm install express typescript @types/express @types/node ts-node-dev --save-dev
```

## Step 6: Create the Express.js Server

Create a basic Express.js server by creating a new file at `apps/api/src/index.ts`:

```typescript
import express from 'express';
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from API' });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
```

## Step 7: Add TypeScript Configuration for the API

Create a `tsconfig.json` file in the API directory:

```json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "lib": ["es2017"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

## Step 8: Update the API's Package.json Scripts

Add the following scripts to the `apps/api/package.json` file:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## Step 9: Update the Root Package.json

Update the root `package.json` to include both workspaces:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

## Step 10: Configure Turborepo Pipeline

Update the `turbo.json` in the root directory to configure the build pipeline:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## Running Your Monorepo

Now you can run the following commands from the root directory:

* To run both apps in development mode:
  ```bash
  npm run dev
  ```

* To build both apps:
  ```bash
  npm run build
  ```

Your Next.js app will run on `http://localhost:3000` and your Express.js API will run on `http://localhost:3001`.

## What's Next?

This setup gives you a monorepo with:
* A Next.js application in `apps/web`
* An Express.js API in `apps/api`
* Support for shared packages in the `packages` directory
* TypeScript support for both applications
* Turborepo handling the build pipeline and dependencies

Consider adding the following to enhance your monorepo:

1. Create shared packages for common code
2. Set up environment variables
3. Add authentication
4. Configure a database
5. Set up deployment scripts

## Troubleshooting Common Issues

### Port Conflicts

If you encounter port conflicts, modify the port numbers in your applications. For the Express API, you can change the port in `apps/api/src/index.ts`. For Next.js, you can set a different port using the `-p` flag with the `next dev` command.

### TypeScript Errors

Ensure your TypeScript configurations are properly set up. The `tsconfig.json` files should be properly configured for each application.

### Package Installation Issues

If you encounter package installation issues, try running `npm install` at the root directory to ensure all dependencies are properly installed.