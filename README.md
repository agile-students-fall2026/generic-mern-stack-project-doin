# Doin

**Less scrolling. More doing.**

Doin is a hobby-based social discovery app that helps people meet others with shared interests and find activities to do together. Instead of endless scrolling, the goal is to make it easier to turn common interests into real-world connections and events.

> **Project status (November 2026):** The Sprint 1 React front-end prototype has been implemented and demonstrated. Sprint 2 focuses on developing the Express.js back end and connecting it to the existing interface. The current front end uses mock data and local React state; it is not yet backed by a persistent database.

## The problem

Finding people who share your hobbies can be difficult, particularly when moving to a new city or starting university. Existing social platforms offer ways to communicate, but do not always make it easy to discover activity partners and organize shared experiences.

## What Doin offers

The MVP focuses on profiles, interests, people discovery, events, and connections. The following features were developed for the **Sprint 1 front-end prototype**:

- **Welcome and account screens:** Welcome, registration, and login pages with form validation and simulated authentication.
- **Onboarding:** Interest selection and profile setup screens.
- **Profiles:** View and edit profile information, including username, bio, and interests.
- **Discover people:** Browse profiles, view individual people, and use search and interest filters.
- **Explore events:** Browse events, view event details, and search or filter available activities.
- **Event participation:** Join or leave events through the prototype interface, and browse joined and hosted events in My Events.
- **Event creation:** Enter event details and add a new event to the prototype's local event list.
- **Connections:** View connections and requests, send connection requests, and accept or decline incoming requests in the prototype.
- **Navigation and styling:** React Router navigation, reusable components, and layouts designed for mobile screens.

These are **front-end demonstration flows**, not a production-ready implementation. Many interactions currently rely on mock data or React state. Data may be lost on refresh or when the app restarts, and account actions do not yet authenticate against a production back end.

## Technology stack

| Layer | Technology | Status |
| --- | --- | --- |
| Front end | React, React Router, Vite, CSS / Tailwind CSS | Sprint 1 prototype implemented |
| Back end | Node.js and Express.js | Sprint 2 development |
| Database | MongoDB | Planned for Sprint 3 |
| Project management | GitHub Issues and GitHub Projects | In use |

## Repository structure

```text
.
├── front-end/         # React application, components, styles, and mock data
├── back-end/          # Express application directory (Sprint 2 work)
├── ux-design/         # App map, wireframes, and design resources
├── README.md          # Project overview and setup instructions
└── CONTRIBUTING.md    # Team workflow and contribution guidelines
```

## Run the front end locally

### Prerequisites

- Node.js and npm. The front-end documentation specifies **Node.js 22.22 or newer**.
- Git, to clone the repository.

### Install and start

Clone the repository, then install the front-end dependencies:

```bash
git clone https://github.com/agile-students-fall2026/generic-mern-stack-project-doin.git
cd generic-mern-stack-project-doin/front-end
npm install
```

Start Vite's development server:

```bash
npm run dev
```

Open the local URL printed in the terminal, typically **http://localhost:5173**. Keep the terminal running while using the application.

If you have already cloned the repository, navigate to its `front-end` directory and run `npm install` followed by `npm run dev`.

### Other front-end commands

Run these from `front-end/`:

```bash
npm run build   # Create a production build
npm run lint    # Check code with oxlint
npm run preview # Preview the production build locally
```

Additional notes are available in [front-end/README.md](front-end/README.md).

## Back-end development (Sprint 2)

The Express.js foundation provides the health endpoint, JSON parsing, development CORS, static serving, and consistent JSON errors. Feature APIs and React integration are separate Sprint 2 tasks. The existing front end continues to use its prototype mocks. MongoDB integration is planned for Sprint 3.

### Install and start

Use **Node.js 22.22 or newer**. From the repository root:

```bash
cd back-end
npm install
npm start
``` 

The server listens on **http://localhost:5000** by default. For automatic restarts when imported server files change, use `npm run dev` instead of `npm start`. Both commands read `PORT`; for example:

```bash
PORT=5001 npm run dev
```

No `.env` file or database is required. Stop the server with **Ctrl+C**. Check it from another terminal:

```bash
curl -i http://localhost:5000/api/health
```

The response is HTTP **200** with `{"status":"ok"}`. Unimplemented API routes return HTTP **404** JSON. Errors use `{"error":{"code":"...","message":"..."}}`; malformed JSON returns **400** with code `INVALID_JSON`. JSON bodies use Express's default **100 KB** limit; oversized bodies return **413**. Unexpected errors return **500** without exposing internal details.

Development CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`, including JSON and the agreed `Mock-User-Id` header. It is disabled when `NODE_ENV=production`. The header is only permitted here; mock identity handling belongs to the authentication task. Vite proxy/API integration remains part of the front-end integration tasks.
### Back-end testing

The back end uses Mocha, Chai, Supertest, and c8 for automated testing. Mocha runs the tests, Chai checks the expected results, Supertest sends HTTP requests to Express endpoints, and c8 measures code coverage.

All test files are stored in back-end/test/ and use the .test.js extension. Tests can import the Express application directly from src/app.js without starting the server on port 5000.

From the back-end directory, run:

```bash
npm test
```

To run tests and generate a code coverage report:
```bash
npm run test:coverage
```


Coverage results are displayed in the terminal, and an HTML report is generated in the back-end/coverage/ directory. Test files and the server entry point are excluded from coverage measurements.

Since Sprint 2 uses a shared in-memory store, tests use resetStore() from src/data/store.js before each test to restore the original mock data. This prevents changes made during one test from affecting other tests.


Additional testing conventions, examples, and instructions for contributing new tests are documented in 
[back-end/TESTING.md](back-end/TESTING.md).

### Application and static files

- `back-end/src/app.js` configures and exports the application **without opening a port**. It also exports `createApp({ publicDirectory, clientDirectory })` so tests can use isolated file fixtures.
- `back-end/src/server.js` imports that application and starts the HTTP listener.
- `back-end/src/routes/index.js` contains the health route and is the place to mount later feature routers. Mount paths omit `/api` because `app.js` adds that prefix.
- `back-end/src/middleware/errorHandler.js` supplies the JSON 404 and final error handlers.
- Files in `back-end/public/` are served under `/static`, so `public/images/example.svg` becomes `/static/images/example.svg`. The initial directory has no demo images; feature owners can add their assets there.
- If `front-end/dist/index.html` exists **when Express starts**, Express serves the built React app and its assets. Build it with `npm run build` in `front-end/`, then start or restart Express. HTML page navigation falls back to that index for React Router. Missing API routes, static files, and asset files retain 404 responses. Without a build, the API and `/static` still work.

### Shared mock data and testing handoff

All later feature routers should import the **same** `store` from `back-end/src/data/store.js`. It contains `users`, `events`, `interests`, `categories`, and `connectionRequests`. These collections are initially empty so this foundation does not duplicate feature-owned fixtures. Feature owners should add deterministic canonical records to `back-end/src/data/seeds.js`, rather than copying React mocks into separate route-local stores.

Runtime mutations persist while Express runs. Restarting Express recreates the store from the seeds. The exported `resetStore()` restores deep copies of those seeds for test isolation, preserving the shared store object's identity. It replaces the collection arrays, so handlers should read `store.users` or `store.events` when handling a request instead of retaining an old array reference.

Issue [#109](https://github.com/agile-students-fall2026/generic-mern-stack-project-doin/issues/109) owns the shared `test/` setup, Mocha/Chai, HTTP test tooling, c8, test/coverage scripts, and individual coverage verification. Tests can import the default app without starting `server.js` and call `resetStore()` before each test. Those packages and npm scripts have **not** been added by the server-foundation task; there is no back-end `npm test` command yet.   

## Project management and contributions

The team follows a Scrum workflow using GitHub Issues and a GitHub Project, with a Product Backlog and separate sprint backlogs and task boards.

- [Doin GitHub Project](https://github.com/orgs/agile-students-fall2026/projects/111)
- [Issues](https://github.com/agile-students-fall2026/generic-mern-stack-project-doin/issues)
- [CONTRIBUTING.md](CONTRIBUTING.md) for branches, pull requests, code review, and team conventions

Do not commit passwords, API keys, database credentials, or private `.env` files to the repository.

## Team

The team members and their **Sprint 0 roles** were:

| Member | GitHub | Sprint 0 role |
| --- | --- | --- |
| Elize Azzi | [ea3682](https://github.com/ea3682) | Stakeholder |
| Maurice Farfan | [MSF841](https://github.com/MSF841) | Developer |
| Alpartun Gunhan | [AlpartunG](https://github.com/AlpartunG) | Product Owner |
| Alp Ozbay | [ozbayalp](https://github.com/ozbayalp) | Scrum Master |

The team members and their **Sprint 1 roles** were:

| Member | GitHub | Sprint 1 role |
| --- | --- | --- |
| Elize Azzi | [ea3682](https://github.com/ea3682) | Scrum Master |
| Maurice Farfan | [MSF841](https://github.com/MSF841) | Product Owner |
| Alpartun Gunhan | [AlpartunG](https://github.com/AlpartunG) | Stakeholder |
| Alp Ozbay | [ozbayalp](https://github.com/ozbayalp) | Developer |

The team members and their **Sprint 2 roles** are:

| Member | GitHub | Sprint 2 role |
| --- | --- | --- |
| Elize Azzi | [ea3682](https://github.com/ea3682) | Developer |
| Maurice Farfan | [MSF841](https://github.com/MSF841) | Stakeholder |
| Alpartun Gunhan | [AlpartunG](https://github.com/AlpartunG) | Scrum Master |
| Alp Ozbay | [ozbayalp](https://github.com/ozbayalp) | Product Owner |

## Planned later features

Potential future additions, outside the current MVP, include direct messaging and more advanced interest-based recommendations.
