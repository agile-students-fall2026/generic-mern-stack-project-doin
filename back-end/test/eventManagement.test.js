
import { expect } from "chai";
import request from "supertest";
import app from "../src/app.js";
import { resetStore, store } from "../src/data/store.js";

describe("[Elize] Event Editing and Cancellation API #106", () => {
  beforeEach(() => {
    resetStore();
  });

  const editEvent = (eventId, changes, userId = "user-alex") =>
    request(app)
      .patch(`/api/events/${eventId}`)
      .set("Mock-User-Id", userId)
      .send(changes);

  const cancelEvent = (eventId, userId = "user-alex") =>
    request(app)
      .delete(`/api/events/${eventId}`)
      .set("Mock-User-Id", userId);

  it("allows the organizer to edit event information", async () => {
    const response = await editEvent("event-1", {
      title: "Updated Tennis Meetup",
      location: "Brooklyn",
    });

    expect(response.status).to.equal(200);
    expect(response.body.title).to.equal("Updated Tennis Meetup");
    expect(response.body.location).to.equal("Brooklyn");
  });

  it("updates the shared event store", async () => {
    const response = await editEvent("event-1", {
      description: "New description",
    });

    expect(response.status).to.equal(200);
    expect(store.events.find((e) => e.id === "event-1")
      .description).to.equal("New description");
  });

  it("shows edited information through GET", async () => {
    await editEvent("event-1", {
      title: "Friday Tennis",
    });

    const response = await request(app)
      .get("/api/events/event-1");

    expect(response.status).to.equal(200);
    expect(response.body.title).to.equal("Friday Tennis");
  });

  it("rejects editing by a different user", async () => {
    const response = await editEvent(
      "event-1",
      { title: "Unauthorized" },
      "user-jordan"
    );

    expect(response.status).to.equal(403);
    expect(response.body.error.code).to.equal("FORBIDDEN");
  });

  it("requires authentication for editing", async () => {
    const response = await request(app)
      .patch("/api/events/event-1")
      .send({ title: "Unauthorized" });

    expect(response.status).to.equal(401);
  });

  it("returns 404 for nonexistent events", async () => {
    const response = await editEvent("missing-event", {
      title: "Not Found",
    });

    expect(response.status).to.equal(404);
  });

  it("rejects impossible dates without changing the event", async () => {
    const originalDate = store.events[0].date;

    const response = await editEvent("event-1", {
      date: "2026-02-30",
    });

    expect(response.status).to.equal(400);
    expect(store.events[0].date).to.equal(originalDate);
  });

  it("rejects invalid time ranges", async () => {
    const response = await editEvent("event-1", {
      startTime: "20:00",
      endTime: "15:00",
    });

    expect(response.status).to.equal(400);
  });

  it("rejects invalid categories", async () => {
    const response = await editEvent("event-1", {
      category: "NotACategory",
    });

    expect(response.status).to.equal(400);
  });

  it("normalizes category aliases", async () => {
    const response = await editEvent("event-1", {
      category: "Gaming",
    });

    expect(response.status).to.equal(200);
    expect(response.body.category).to.equal("Games");
  });

  it("prevents changing organizer or status through PATCH", async () => {
    const response = await editEvent("event-1", {
      organizerId: "user-jordan",
      status: "active",
    });

    expect(response.status).to.equal(400);
    expect(store.events[0].organizerId).to.equal("user-alex");
  });

  it("rejects empty updates", async () => {
    const response = await editEvent("event-1", {});

    expect(response.status).to.equal(400);
  });

  it("allows the organizer to cancel an event", async () => {
    const response = await cancelEvent("event-1");

    expect(response.status).to.equal(200);
    expect(response.body.status).to.equal("cancelled");
    expect(store.events[0].status).to.equal("cancelled");
  });

  it("removes cancelled events from active GET listings", async () => {
    await cancelEvent("event-1");

    const response = await request(app).get("/api/events");

    expect(response.status).to.equal(200);
    expect(response.body.some(
      (event) => event.id === "event-1"
    )).to.equal(false);
  });

  it("prevents a different user from cancelling", async () => {
    const response = await cancelEvent("event-1", "user-jordan");

    expect(response.status).to.equal(403);
    expect(store.events[0].status).to.equal("active");
  });

  it("requires authentication for cancellation", async () => {
    const response = await request(app)
      .delete("/api/events/event-1");

    expect(response.status).to.equal(401);
  });

  it("returns 404 when cancelling a nonexistent event", async () => {
    const response = await cancelEvent("missing-event");

    expect(response.status).to.equal(404);
  });

  it("prevents editing a cancelled event", async () => {
    await cancelEvent("event-1");

    const response = await editEvent("event-1", {
      title: "Should Not Update",
    });

    expect(response.status).to.equal(409);
  });

  it("prevents cancelling the same event twice", async () => {
    await cancelEvent("event-1");

    const response = await cancelEvent("event-1");

    expect(response.status).to.equal(409);
  });
});
