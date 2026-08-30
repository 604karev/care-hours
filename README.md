# Care Hours

Care Hours is a cloud-based work timesheet for recording client visits, working hours, and rates. The frontend is built with React, TypeScript, and Vite and deployed to GitHub Pages. Supabase provides authentication and the PostgreSQL database.

Live application: [604karev.github.io/care-hours](https://604karev.github.io/care-hours/)

The product specification is stored next to the project at `../care-hours-product-spec.md`.

## Features

- account registration and sign-in with Supabase Auth;
- password recovery by email;
- Russian, Polish, and English interfaces with automatic browser-language detection;
- manual language selection saved in the browser;
- a client directory with planned monthly hours and visits;
- colour-coded hourly and per-visit rates;
- a monthly timesheet with multiple visits in one cell;
- automatic totals by client, rate, and month;
- rate snapshots, so historical amounts do not change when a rate is edited;
- separate workspaces and Row Level Security for data isolation;
- automated linting, tests, production builds, and GitHub Pages deployment.

## Tech stack

- React 19;
- TypeScript;
- Vite;
- Supabase Auth;
- PostgreSQL and Row Level Security;
- Vitest and Testing Library;
- GitHub Actions and GitHub Pages.

## Local development

Node.js 20 or newer is required. From the project directory, run:

```powershell
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`. If Supabase is not configured, the application displays a setup screen instead of the sign-in form.

On the first visit, the interface language is selected from the browser locale. Russian, Polish, and English are supported. A manual selection is saved in the browser and reused on subsequent visits.

Run the following checks before committing:

```powershell
npm run lint
npm test
npm run build
```

## Supabase setup

### 1. Create a cloud project

1. Create an account at [supabase.com](https://supabase.com/).
2. Create an organisation and a new project on the Free plan.
3. Select the nearest available EU region.
4. Store the database password in a password manager. Never send it in chat or commit it to Git.

### 2. Configure local environment variables

Open the project API settings in the Supabase Dashboard and copy:

- Project URL;
- Publishable key.

Create `.env.local` from the example:

```powershell
Copy-Item .env.example .env.local
```

Set only the following values:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_BASE_PATH=/
```

The publishable key is intended for frontend applications. Never expose a secret or service-role key through a variable prefixed with `VITE_`.

### 3. Create the database schema

Open the SQL Editor in the Supabase Dashboard, copy the contents of:

```text
supabase/migrations/20260829180000_initial_schema.sql
```

Run the SQL once. The migration creates the tables, the personal-workspace function, and the Row Level Security policies.

Future migrations can be applied with the locally installed Supabase CLI:

```powershell
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
```

Docker is not required for these remote commands. It is only needed when running the complete Supabase stack locally, which this project does not currently require.

### 4. Configure registration and sign-in

1. In **Authentication → Providers → Email**, enable **Allow new users to sign up**.
2. Keeping **Confirm email** enabled is recommended.
3. In **Authentication → URL Configuration**, set the deployed application URL as the **Site URL**.
4. Add a local address such as `http://127.0.0.1:5173/**` to **Redirect URLs**.
5. Add the GitHub Pages address, such as `https://USERNAME.github.io/care-hours/**`, to **Redirect URLs**.
6. Restart `npm run dev` after changing `.env.local`.

Users can create an account directly from the sign-in page. When email confirmation is enabled, Supabase sends a confirmation link. When it is disabled, the user receives a session immediately.

After the first authenticated load, the application calls `ensure_personal_workspace()` to create or retrieve a private workspace for the user.

## Database access

A separate database client is not required:

- **Table Editor** displays tables and rows in a spreadsheet-like interface;
- **SQL Editor** runs and saves SQL queries;
- **Authentication → Users** displays registered accounts.

If a desktop client becomes useful later, DBeaver can connect using the connection string available from the **Connect** button in the Supabase Dashboard. For the current version, the Dashboard is simpler and safer.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` automatically tests, builds, and publishes the application after every push to `main`.

Configure the GitHub repository as follows:

1. Open **Settings → Pages** and select **GitHub Actions** as the source.
2. Open **Settings → Secrets and variables → Actions → Variables**.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as repository variables.

User data is never stored in GitHub. It is loaded from Supabase only after authentication and Row Level Security checks.

## Editor

Visual Studio Code is recommended, but the project is not tied to a particular IDE. WebStorm and other editors work as well. An IDE is not required to view the application; `npm run dev` and a browser are sufficient.

## Project structure

```text
src/
  features/auth/       registration and sign-in
  features/clients/    client cards and forms
  features/rates/      rates, colours, and payment settings
  features/month/      monthly timesheet and visits
  features/workspace/  data loading, types, and calculations
  i18n/                translations and language selection
  lib/supabase.ts      Supabase client
  test/                test setup
supabase/
  migrations/          versioned PostgreSQL schema and RLS
.github/workflows/     GitHub Pages deployment
```

## Security notes

- Do not commit `.env.local`.
- Never put the Supabase secret or service-role key in frontend code.
- The publishable key is safe to expose when Row Level Security policies are correctly enabled.
- Each authenticated user can access only their own workspace data.
