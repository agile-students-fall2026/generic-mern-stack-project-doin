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

The Express.js back end is being developed during Sprint 2. Its goal is to provide JSON API routes for the existing front-end features and replace front-end-only mock interactions with API requests. Mock or in-memory server data is sufficient for this sprint; MongoDB integration is planned for Sprint 3.

**Back-end installation, server startup, API routes, environment configuration, automated tests, and code coverage commands will be documented here after they are implemented and verified.** They are not yet available as confirmed setup instructions.

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
