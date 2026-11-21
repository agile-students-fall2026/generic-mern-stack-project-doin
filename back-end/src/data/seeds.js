// Deterministic starting state for the ONE shared store.
// Feature owners add canonical fixtures here in their tasks:
// users: #97; interests: #94; events/categories: #103; connectionRequests: #111.
// Keep these empty until those fixtures are supplied; do not copy React mocks.
export const seeds = {
  // Shared user and profile records (#97). Field meanings and the public
  // response shape are documented in docs/user-profile-data.md.
  // Email is stored on the record but is never sent in a response, and seed
  // users have no credentials, so they cannot log in.
  users: [
    {
      id: "user-alex",
      name: "Alex Morgan",
      email: "alex@example.com",
      username: "alexmorgan",
      bio: "I love exploring coffee shops and going on weekend hikes.",
      location: "New York, NY",
      imageUrl: "https://picsum.photos/seed/doin-alex/200/200",
      interests: ["Coffee", "Hiking"],
      profileComplete: true,
    },
    {
      id: "user-jordan",
      name: "Jordan Lee",
      email: "jordan@example.com",
      username: "jordanlee",
      bio: "Always looking for good music and people to watch movies with.",
      location: "New York, NY",
      imageUrl: "https://picsum.photos/seed/doin-jordan/200/200",
      interests: ["Music", "Movies"],
      profileComplete: true,
    },
    {
      id: "user-sam",
      name: "Sam Rivera",
      email: "sam@example.com",
      username: "samrivera",
      bio: "Into sports, museums, and discovering new activities.",
      location: "New York, NY",
      imageUrl: "https://picsum.photos/seed/doin-sam/200/200",
      interests: ["Sports", "Art"],
      profileComplete: true,
    },
    {
      id: "user-taylor",
      name: "Taylor Brooks",
      email: "taylor@example.com",
      username: "taylorbrooks",
      bio: "Weekend explorer who loves trying new activities around the city.",
      location: "New York, NY",
      imageUrl: "https://picsum.photos/seed/doin-taylor/200/200",
      interests: ["Hiking", "Music", "Games"],
      profileComplete: true,
    },
    {
      id: "user-priya",
      name: "Priya Patel",
      email: "priya@example.com",
      username: "priyapatel",
      bio: "Grad student who studies best with company and good food.",
      location: "New York, NY",
      imageUrl: "https://picsum.photos/seed/doin-priya/200/200",
      interests: ["Study", "Food"],
      profileComplete: true,
    },
    {
      id: "user-chris",
      name: "Chris Nguyen",
      email: "chris@example.com",
      username: "chrisnguyen",
      bio: "Morning runner looking for training partners and game nights.",
      location: "New York, NY",
      imageUrl: "https://picsum.photos/seed/doin-chris/200/200",
      interests: ["Running", "Games"],
      profileComplete: true,
    },
  ],
  events: [],
  interests: [],
  categories: [],
  connectionRequests: [],
};
