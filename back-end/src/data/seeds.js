// Deterministic starting state for the ONE shared store.
// Feature owners add canonical fixtures here in their tasks:
// users: #97; interests: #94; events/categories: #103; connectionRequests: #111.
// Keep these empty until those fixtures are supplied; do not copy React mocks.
export const seeds = {
  users: [],
events: [
  {
    id: "event-1",
    title: "Tennis Meetup",
    description: "Play tennis with new friends.",
    date: "2026-11-25",
    startTime: "15:00",
    endTime: "17:00",
    timezone: "America/New_York",
    location: "Central Park",
    category: "Sports",
    imageUrl: "/static/images/event-default.svg",
    organizerId: "user-1",
    attendeeIds: [],
    capacity: 10,
    status: "active",
  },
  {
    id: "event-2",
    title: "Board Game Night",
    description: "Meet people and play board games.",
    date: "2026-11-27",
    startTime: "18:00",
    endTime: "20:00",
    timezone: "America/New_York",
    location: "Brooklyn",
    category: "Games",
    imageUrl: "/static/images/event-default.svg",
    organizerId: "user-2",
    attendeeIds: [],
    capacity: 8,
    status: "active",
  },
],
  interests: [],
  categories: ["Art", "Food", "Games", "Music", "Social", "Sports"],
  connectionRequests: [],
};
