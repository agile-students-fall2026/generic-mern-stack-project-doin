# Doin Sprint 2 - User and Profile Data Structure

Related issue: #97
Based on the shared architecture in #91.

## 1. User Data Structure

All features use the same user record. The record is stored once in the
shared in-memory store, and every route reads and updates that same record.

### Stored record

This is the full record kept in the store. Two fields are private and are
never sent to the front end.

```json
{
  "id": "user-alex",
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "username": "alexmorgan",
  "bio": "I love exploring coffee shops and going on weekend hikes.",
  "location": "New York, NY",
  "imageUrl": "https://picsum.photos/seed/doin-alex/200/200",
  "interests": ["Coffee", "Hiking"],
  "profileComplete": true
}
```

A record created by registration also carries a `credentials` object with
the salted password hash. Seed users have no `credentials`, so they cannot
log in. Login attempts for them fail with the usual invalid credentials
response.

### Public response

Every endpoint that returns a user returns only these fields. The shared
serializer in `back-end/src/shared/serializers.js` builds this shape, so
`email` and `credentials` never leave the server.

```json
{
  "id": "user-alex",
  "name": "Alex Morgan",
  "username": "alexmorgan",
  "bio": "I love exploring coffee shops and going on weekend hikes.",
  "location": "New York, NY",
  "imageUrl": "https://picsum.photos/seed/doin-alex/200/200",
  "interests": ["Coffee", "Hiking"],
  "profileComplete": true
}
```

### Fields

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Unique user ID. Seed users use readable IDs such as `user-alex`. New registrations get a server generated UUID string. |
| name | string | Full name from registration. The front end maps its `fullName` input to `name`. |
| email | string | Stored record only. Never appears in a response. Used to find the account at login and to reject duplicate registrations. |
| credentials | object | Stored record only, and only on registered users. Holds the salt and password hash. Never appears in a response. |
| username | string or null | Chosen during profile setup. `null` until then. |
| bio | string | Short profile bio. Empty string until set. |
| location | string | Free text location. Empty string until set. |
| imageUrl | string | Profile image URL. Empty string when the user has no photo. |
| interests | array of strings | Values from the canonical interest list in #91. Empty array until the user picks interests. |
| profileComplete | boolean | `false` from registration until profile setup is finished, then `true`. Login uses it to resume onboarding. |

A new registration starts with `username` set to `null`, `bio`, `location`,
and `imageUrl` set to empty strings, `interests` set to an empty array, and
`profileComplete` set to `false`. Interest selection, profile setup, and
profile editing all update this same record.

### Data conventions

- User IDs are strings everywhere. Nothing stores a numeric user ID.
- Interests are stored as an array of strings, never as one joined string.
- Interest values come from the canonical list in #91, which is Coffee,
  Running, Art, Movies, Food, Music, Study, Games, Sports, and Hiking.
  The values Arts and Gaming are normalized to Art and Games.
- Responses return the user object directly, with no wrapper around it.
- Profile data is never duplicated. Discovery, events, and connections all
  reference the one stored record by its ID.

## 2. How User IDs Are Referenced

- The current user is identified by the `Mock-User-Id` header, which
  carries the user ID. The front end saves that ID in session storage
  under the key `doin.currentUserId` after login or registration.
- Routes take user IDs from the URL, as in `GET /api/users/:userId`.
- Events reference users with `organizerId` and `attendeeIds`.
- Connection requests reference users with `senderId` and `recipientId`.
- The server always works out the acting user from the header, never from
  a user ID sent inside a request body.

## 3. Where the Data Lives

- Seed users live in the `users` array in `back-end/src/data/seeds.js`.
- All routers share the one in-memory store in
  `back-end/src/data/store.js`. No router keeps its own copy of the users.
- Restarting Express restores the seed data. Tests call `resetStore()` to
  get a clean store.
- MongoDB arrives in Sprint 3. The field names and the public response
  shape stay the same when it does.

## 4. Endpoints That Return Users

Successful responses return the public user shape from section 1.

| Method | Route | Successful Response | Owner |
| --- | --- | --- | --- |
| POST | /api/auth/register | 201 User | Alpartun |
| POST | /api/auth/login | 200 User | Alpartun |
| GET | /api/users/me | 200 User | Alpartun |
| POST | /api/users/:userId/interests | 200 User | Alpartun |
| POST | /api/profiles | 200 User | Alp |
| PATCH | /api/users/:userId | 200 User | Alp |
| GET | /api/users | 200 User[] | Alp |
| GET | /api/users/:userId | 200 User | Alp |
| GET | /api/users/:userId/connections | 200 User[] | Maurice |

Errors return JSON in the shared error shape, an object with an `error`
field holding a `code` and a `message`, with the matching HTTP status
code. A request for a user ID that does not exist returns a 404 error in
that shape.

## 5. Front End Notes

- The Profile, Edit Profile, Setup Profile, and Person Details pages
  already use these field names, so they can read API responses directly.
- The older discovery mocks use different field names, with numeric IDs,
  `hobbies` in place of `interests`, and `image` in place of `imageUrl`.
  The front end already has `normalizePerson` to adapt those records, and
  the integration task #101 replaces the mocks with API data. The back end
  does not add aliases for the old names.
- Shared interests on the Person Details page are worked out in the front
  end by comparing two users interest lists. They are not a stored field.
