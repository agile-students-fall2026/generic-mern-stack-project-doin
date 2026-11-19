
# Doin Sprint 2 - Event Data and API Contracts

Related issue: #103
Based on the shared architecture in #91.

## 1. Event Data Structure

All events use the same JSON format.

```json
{
  "id": "event-coffee",
  "title": "Weekend coffee meetup",
  "description": "Meet other coffee enthusiasts.",
  "date": "2026-11-22",
  "startTime": "15:00",
  "endTime": "17:00",
  "timezone": "America/New_York",
  "location": "West Village",
  "category": "Social",
  "imageUrl": "/static/images/event-default.svg",
  "organizerId": "user-alex",
  "attendeeIds": ["user-jordan"],
  "capacity": 12,
  "status": "active"
}
```

### Data Conventions

- Event and user IDs are strings.
- Dates use YYYY-MM-DD.
- Times use HH:mm.
- The event image field is imageUrl.
- organizerId identifies the user hosting the event.
- attendeeIds contains the IDs of attendees.
- Attendance is calculated from attendeeIds.length.
- Hosting does not automatically make the organizer an attendee.
- Capacity is a positive integer.
- Event status is active or cancelled.
- Event categories are Art, Food, Games, Music, Social, and Sports.
- React mock values such as Gaming and Arts must be normalized to Games and Art.

## 2. Event API Endpoints

All dynamic routes use Express.js and the /api prefix.

| Method | Route | Successful Response |
| --- | --- | --- |
| GET | /api/events | 200 Event[] |
| GET | /api/events/categories | 200 string[] |
| GET | /api/events/:eventId | 200 Event |
| POST | /api/events | 201 Event |
| PATCH | /api/events/:eventId | 200 Event |
| DELETE | /api/events/:eventId | 200 Event |
| POST | /api/events/:eventId/rsvp | 200 Event |
| DELETE | /api/events/:eventId/rsvp | 200 Event |
| GET | /api/users/:userId/events | 200 Event[] |

Successful responses return JSON objects or arrays directly, without a data wrapper.

### Event Discovery

GET /api/events returns available active events.

The endpoint must support event searching and filtering, including category filtering. A search without matches returns an empty array.

Exact query parameter names must be kept consistent with the event API implementation and React filters.

GET /api/events/:eventId returns the matching event, including its organizerId and attendeeIds. An unknown ID returns a JSON 404 error.

## 3. Creating Events

POST /api/events accepts event details from the Create Event form.

Example request body:

```json
{
  "title": "Board Game Night",
  "description": "Join us for board games.",
  "date": "2026-11-25",
  "startTime": "18:00",
  "endTime": "20:00",
  "timezone": "America/New_York",
  "location": "Brooklyn",
  "category": "Games",
  "capacity": 10,
  "imageUrl": ""
}
```

The server generates a string ID and determines organizerId from the Mock-User-Id header.

New events begin with status active and an empty attendeeIds array.

## 4. Editing and Cancelling Events

PATCH /api/events/:eventId updates an existing event.

Only the organizer can edit their event.

An event cannot have its capacity reduced below the number of existing attendees.

DELETE /api/events/:eventId cancels an event.

Cancelled events are kept in the shared store with:

```json
{
  "status": "cancelled"
}
```

Cancelled events are excluded from active discovery but remain available for relevant event history and references.

## 5. RSVP and Attendee Data

The RSVP endpoints use the same event records as the event management endpoints.

- Joining an event adds the current user's ID to attendeeIds.
- Leaving an event removes the current user's ID.
- Full or cancelled events reject new RSVPs.
- Attendance is based on attendeeIds.length.
- Event editing must account for existing attendance.
- My Events uses the shared event and attendee data.

Maurice is responsible for RSVP implementation. Event and RSVP routes must use the same records.

## 6. Shared Mock Data

Sprint 2 uses one shared in-memory store.

- src/data/seeds.js defines initial mock records.
- src/data/store.js provides the shared data store.
- All feature routes read and update the same event records.
- Data changes persist while the Express server runs.
- Restarting Express restores seed data.
- resetStore() restores the initial state for automated tests.
- MongoDB is not required until Sprint 3.

## 7. Identity and Error Handling

Sprint 2 uses simulated identity.

- Browser storage key: doin.currentUserId
- HTTP request header: Mock-User-Id
- The server identifies the acting user from the header.
- Only event organizers can edit or cancel their events.
- API errors return JSON and appropriate HTTP status codes.

The event routes must handle:

- Missing or invalid required fields
- Nonexistent event IDs
- Unauthorized event editing or cancellation
- RSVP requests for full or cancelled events
- Invalid capacity changes

Specific error response formats and status codes should match the team's shared error-handling implementation.

## 8. Front-End Integration

The following React pages use these conventions:

- Explore
- Event Details
- Create Event
- Edit Event
- My Events

React will retrieve event data from Express and send form changes to the appropriate API routes.

Edit Event routing and cancellation interactions must be restored as part of #107.

Changes to App.jsx, EventDetails.jsx, and shared RSVP data must be coordinated with teammates.

## 9. Coordination

This document follows the architecture agreed upon in #91.

Before considering #103 complete:
- Confirm event and RSVP compatibility with Maurice.
- Confirm the discovery query parameter names.
- Confirm error response conventions with the shared Express implementation.
- Review the event/category seed data responsibilities.
