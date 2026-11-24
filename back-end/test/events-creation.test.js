
import { expect } from "chai";
import request from "supertest";
import app from "../src/app.js";
import { resetStore } from "../src/data/store.js";

describe("[Elize] POST /api/events", () => {
  beforeEach(() => {
    resetStore();
  });

  const validEvent = {
    title: "Coffee Meetup",
    description: "Meet new friends over coffee.",
    date: "2026-12-05",
    startTime: "14:00",
    endTime: "16:00",
    location: "Manhattan",
    category: "Social",
    organizerId: "user-alex",
    capacity: 10,
  };

  it("creates an event and returns 201", async () => {
    const response = await request(app)
      .post("/api/events")
      .send(validEvent);

    expect(response.status).to.equal(201);
    expect(response.body.title).to.equal("Coffee Meetup");
    expect(response.body.id).to.be.a("string");
    expect(response.body.attendeeIds).to.deep.equal([]);
    expect(response.body.status).to.equal("active");
  });

  it("creates a unique ID for every event", async () => {
    const first = await request(app)
      .post("/api/events")
      .send(validEvent);

    const second = await request(app)
      .post("/api/events")
      .send(validEvent);

    expect(first.status).to.equal(201);
    expect(second.status).to.equal(201);
    expect(first.body.id).to.not.equal(second.body.id);
  });

  it("rejects missing required fields", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({ title: "Incomplete Event" });

    expect(response.status).to.equal(400);
    expect(response.body.error.code).to.equal("BAD_REQUEST");
  });

  it("rejects an invalid category", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({ ...validEvent, category: "Unknown" });

    expect(response.status).to.equal(400);
  });

  it("rejects an unknown organizer", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({ ...validEvent, organizerId: "unknown-user" });

    expect(response.status).to.equal(400);
  });

  it("rejects invalid event times", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({
        ...validEvent,
        startTime: "18:00",
        endTime: "14:00",
      });

    expect(response.status).to.equal(400);
  });

  it("allows created events to be retrieved", async () => {
    const created = await request(app)
      .post("/api/events")
      .send(validEvent);

    expect(created.status).to.equal(201);

    const response = await request(app)
      .get(`/api/events/${created.body.id}`);

    expect(response.status).to.equal(200);
    expect(response.body.title).to.equal("Coffee Meetup");
  });
});
