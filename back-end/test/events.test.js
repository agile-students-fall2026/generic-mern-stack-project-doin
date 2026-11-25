
import { expect } from "chai";
import request from "supertest";
import app from "../src/app.js";
import { resetStore, store } from "../src/data/store.js";

describe("[Elize] Events API #108", () => {
  beforeEach(() => {
    resetStore();
  });

  it("returns all active events with the expected IDs", async () => {
    const response = await request(app).get("/api/events");

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an("array");
    expect(response.body).to.have.lengthOf(2);

    const ids = response.body.map((event) => event.id);

    expect(ids).to.have.members(["event-1", "event-2"]);
    expect(response.body.every(
      (event) => event.status === "active"
    )).to.equal(true);
  });

  it("excludes cancelled events from active listings", async () => {
    const event = store.events.find(
      (item) => item.id === "event-1"
    );
    event.status = "cancelled";

    const response = await request(app).get("/api/events");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-2");
    expect(response.body.some(
      (item) => item.id === "event-1"
    )).to.equal(false);
  });

  it("returns one event by ID", async () => {
    const response = await request(app)
      .get("/api/events/event-1");

    expect(response.status).to.equal(200);
    expect(response.body.id).to.equal("event-1");
    expect(response.body.title).to.equal("Tennis Meetup");
  });

  it("returns the available event categories", async () => {
    const response = await request(app)
      .get("/api/events/categories");

    expect(response.status).to.equal(200);
    expect(response.body).to.include("Sports");
    expect(response.body).to.include("Games");
  });

  it("filters events by category", async () => {
    const response = await request(app)
      .get("/api/events?category=Sports");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-1");
    expect(response.body[0].category).to.equal("Sports");
  });

  it("normalizes category aliases", async () => {
    const response = await request(app)
      .get("/api/events?category=Gaming");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-2");
    expect(response.body[0].category).to.equal("Games");
  });

  it("searches events by title and excludes unrelated events", async () => {
    const response = await request(app)
      .get("/api/events?search=Tennis");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].title).to.equal("Tennis Meetup");

    expect(response.body.some(
      (event) => event.id === "event-2"
    )).to.equal(false);
  });

  it("searches events without case sensitivity", async () => {
    const response = await request(app)
      .get("/api/events?search=tEnNiS");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-1");
  });

  it("returns an empty array when no events match", async () => {
    const response = await request(app)
      .get("/api/events?search=NonexistentActivity");

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([]);
  });

  it("filters events by location", async () => {
    const response = await request(app)
      .get("/api/events?location=Brooklyn");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-2");
    expect(response.body[0].location).to.equal("Brooklyn");
  });

  it("filters locations without case sensitivity", async () => {
    const response = await request(app)
      .get("/api/events?location=central%20park");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-1");
  });

  it("filters events by date", async () => {
    const response = await request(app)
      .get("/api/events?date=2026-11-25");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-1");
    expect(response.body[0].date).to.equal("2026-11-25");
  });

  it("combines search, category, location, and date filters", async () => {
    const response = await request(app)
      .get("/api/events")
      .query({
        search: "tennis",
        category: "Sports",
        location: "Central Park",
        date: "2026-11-25",
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.lengthOf(1);
    expect(response.body[0].id).to.equal("event-1");
  });

  it("returns no results when combined filters do not match", async () => {
    const response = await request(app)
      .get("/api/events")
      .query({
        search: "Tennis",
        category: "Games",
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([]);
  });

  it("rejects impossible dates", async () => {
    const response = await request(app)
      .get("/api/events?date=2026-02-30");

    expect(response.status).to.equal(400);
    expect(response.body.error.code).to.equal(
      "VALIDATION_ERROR"
    );
  });

  it("rejects invalid date formats", async () => {
    const response = await request(app)
      .get("/api/events?date=not-a-date");

    expect(response.status).to.equal(400);
    expect(response.body.error.code).to.equal(
      "VALIDATION_ERROR"
    );
  });

  it("rejects repeated query parameters", async () => {
    const response = await request(app)
      .get("/api/events?category=Sports&category=Games");

    expect(response.status).to.equal(400);
    expect(response.body.error.code).to.equal(
      "VALIDATION_ERROR"
    );
  });

  it("returns 404 for an unknown event", async () => {
    const response = await request(app)
      .get("/api/events/unknown");

    expect(response.status).to.equal(404);
    expect(response.body.error.code).to.equal("NOT_FOUND");
  });
});
