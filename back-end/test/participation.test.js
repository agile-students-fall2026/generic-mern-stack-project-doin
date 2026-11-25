import { expect } from "chai";
import request from "supertest";
import app from "../src/app.js";
import { store, resetStore } from "../src/data/store.js";

describe("[Maurice] RSVP API", () => {
 beforeEach(() => {
  resetStore();

  // Isolate RSVP tests from the shared event seed data
  store.events = [
    {
      id: "event-test",
      title: "Test Event",
      organizerId: "user-alex",
      attendeeIds: [],
      capacity: 10,
      status: "active"
    }
  ];
});

  // =====================================
  // JOIN EVENT TESTS
  // =====================================

  it("allows a user to join an event", async () => {
    const response = await request(app)
      .post("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(200);
    expect(response.body.attendeeIds).to.include("user-jordan");
    expect(store.events[0].attendeeIds).to.include("user-jordan");
  });

  it("prevents duplicate event registrations", async () => {
    store.events[0].attendeeIds.push("user-jordan");

    const response = await request(app)
      .post("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(409);
    expect(response.body.error.code).to.equal("ALREADY_REGISTERED");

    expect(
      store.events[0].attendeeIds.filter(id => id === "user-jordan")
    ).to.have.lengthOf(1);
  });

  it("prevents users from joining cancelled events", async () => {
    store.events[0].status = "cancelled";

    const response = await request(app)
      .post("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(409);
    expect(response.body.error.code).to.equal("EVENT_UNAVAILABLE");
    expect(store.events[0].attendeeIds).to.not.include("user-jordan");
  });

  it("prevents users from joining full events", async () => {
    store.events[0].capacity = 1;
    store.events[0].attendeeIds.push("user-sam");

    const response = await request(app)
      .post("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(409);
    expect(response.body.error.code).to.equal("EVENT_FULL");
    expect(store.events[0].attendeeIds).to.have.lengthOf(1);
  });

  it("returns 404 for a nonexistent event", async () => {
    const response = await request(app)
      .post("/api/events/nonexistent/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(404);
    expect(response.body.error.code).to.equal("NOT_FOUND");
  });

  it("rejects RSVP requests without a user header", async () => {
    const response = await request(app)
      .post("/api/events/event-test/rsvp");

    expect(response.status).to.equal(401);
    expect(response.body.error.code).to.equal("INVALID_MOCK_IDENTITY");
    expect(store.events[0].attendeeIds).to.have.lengthOf(0);
  });

  it("rejects RSVP requests with an invalid user", async () => {
    const response = await request(app)
      .post("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "nonexistent-user");

    expect(response.status).to.equal(401);
    expect(response.body.error.code).to.equal("INVALID_MOCK_IDENTITY");
    expect(store.events[0].attendeeIds).to.have.lengthOf(0);
  });

  // =====================================
  // LEAVE EVENT TESTS
  // =====================================

  it("allows a user to leave an event", async () => {
    store.events[0].attendeeIds.push("user-jordan");

    const response = await request(app)
      .delete("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(200);
    expect(response.body.attendeeIds).to.not.include("user-jordan");
    expect(store.events[0].attendeeIds).to.not.include("user-jordan");
  });

  it("prevents users from leaving events they have not joined", async () => {
    const response = await request(app)
      .delete("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(409);
    expect(response.body.error.code).to.equal("NOT_REGISTERED");
  });

  it("returns 404 when leaving a nonexistent event", async () => {
    const response = await request(app)
      .delete("/api/events/nonexistent/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(404);
    expect(response.body.error.code).to.equal("NOT_FOUND");
  });

  it("allows a user to leave a cancelled event", async () => {
    store.events[0].attendeeIds.push("user-jordan");
    store.events[0].status = "cancelled";

    const response = await request(app)
      .delete("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(200);
    expect(store.events[0].attendeeIds).to.not.include("user-jordan");
  });

  it("rejects leave requests without a valid user", async () => {
    store.events[0].attendeeIds.push("user-jordan");

    const response = await request(app)
      .delete("/api/events/event-test/rsvp");

    expect(response.status).to.equal(401);
    expect(store.events[0].attendeeIds).to.include("user-jordan");
  });

  // =====================================
  // MY EVENTS TESTS
  // =====================================

  it("returns events a user has joined", async () => {
    store.events[0].attendeeIds.push("user-jordan");

    const response = await request(app)
      .get("/api/users/user-jordan/events?type=joined")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an("array");
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-test");
  });

  it("returns events a user is hosting", async () => {
    const response = await request(app)
      .get("/api/users/user-alex/events?type=hosting")
      .set("Mock-User-Id", "user-alex");

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an("array");
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-test");
    expect(response.body[0].organizerId).to.equal("user-alex");
  });

  it("returns both joined and hosted events without a filter", async () => {
    store.events[0].attendeeIds.push("user-jordan");

    store.events.push({
      id: "event-hosted",
      title: "Jordan's Event",
      organizerId: "user-jordan",
      attendeeIds: [],
      capacity: 5,
      status: "active"
    });

    const response = await request(app)
      .get("/api/users/user-jordan/events")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(2);

    const eventIds = response.body.map(event => event.id);
    expect(eventIds).to.include.members(["event-test", "event-hosted"]);
  });

  it("returns an empty array when a user has no joined events", async () => {
    const response = await request(app)
      .get("/api/users/user-sam/events?type=joined")
      .set("Mock-User-Id", "user-sam");

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([]);
  });

  it("returns 404 for a nonexistent user", async () => {
    const response = await request(app)
      .get("/api/users/nonexistent/events")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(404);
    expect(response.body.error.code).to.equal("NOT_FOUND");
  });

  it("prevents users from viewing another user's My Events", async () => {
    const response = await request(app)
      .get("/api/users/user-alex/events")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(403);
    expect(response.body.error.code).to.equal("FORBIDDEN");
  });

  it("rejects invalid event filters", async () => {
    const response = await request(app)
      .get("/api/users/user-jordan/events?type=invalid")
      .set("Mock-User-Id", "user-jordan");

    expect(response.status).to.equal(400);
    expect(response.body.error.code).to.equal("VALIDATION_ERROR");
  });

  it("requires a valid user header for My Events", async () => {
    const response = await request(app)
      .get("/api/users/user-jordan/events");

    expect(response.status).to.equal(401);
    expect(response.body.error.code).to.equal("INVALID_MOCK_IDENTITY");
  });

  // =====================================
  // DATA CONSISTENCY TEST
  // =====================================

  it("updates My Events after joining and leaving", async () => {
    // Join the event
    const joinResponse = await request(app)
      .post("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(joinResponse.status).to.equal(200);

    // Verify it appears in My Events
    const joinedResponse = await request(app)
      .get("/api/users/user-jordan/events?type=joined")
      .set("Mock-User-Id", "user-jordan");

    expect(joinedResponse.body.map(e => e.id)).to.include("event-test");

    // Leave the event
    const leaveResponse = await request(app)
      .delete("/api/events/event-test/rsvp")
      .set("Mock-User-Id", "user-jordan");

    expect(leaveResponse.status).to.equal(200);

    // Verify it is removed from My Events
    const updatedResponse = await request(app)
      .get("/api/users/user-jordan/events?type=joined")
      .set("Mock-User-Id", "user-jordan");

    expect(updatedResponse.body.map(e => e.id))
      .to.not.include("event-test");
  });
});

 

