
import { expect } from "chai";
import request from "supertest";
import app from "../src/app.js";
import { resetStore, store } from "../src/data/store.js";

describe("[Elize] Event Creation API #105", () => {
  beforeEach(() => {
    resetStore();
  });

  const validEvent = {
    title: "Coffee Meetup",
    description: "Meet new friends.",
    date: "2026-12-05",
    startTime: "14:00",
    endTime: "16:00",
    location: "Manhattan",
    category: "Social",
    capacity: 10,
  };

  const createEvent = (data, userId = "user-alex") =>
    request(app)
      .post("/api/events")
      .set("Mock-User-Id", userId)
      .send(data);

  it("creates an event and returns 201", async () => {
    const response = await createEvent(validEvent);

    expect(response.status).to.equal(201);
    expect(response.body.title).to.equal("Coffee Meetup");
    expect(response.body.organizerId).to.equal("user-alex");
    expect(response.body.status).to.equal("active");
    expect(response.body.attendeeIds).to.deep.equal([]);
  });

  it("generates a unique ID for each event", async () => {
    const first = await createEvent(validEvent);
    const second = await createEvent(validEvent);

    expect(first.status).to.equal(201);
    expect(second.status).to.equal(201);
    expect(first.body.id).to.not.equal(second.body.id);
  });

  it("saves created events in the shared store", async () => {
    const response = await createEvent(validEvent);

    expect(response.status).to.equal(201);

    const savedEvent = store.events.find(
      (event) => event.id === response.body.id
    );

    expect(savedEvent).to.deep.equal(response.body);
  });

  it("requires a mock user identity", async () => {
    const response = await request(app)
      .post("/api/events")
      .send(validEvent);

    expect(response.status).to.equal(401);
  });

  it("uses the logged-in user as the organizer", async () => {
    const response = await createEvent({
      ...validEvent,
      organizerId: "user-jordan",
    });

    expect(response.status).to.equal(201);
    expect(response.body.organizerId).to.equal("user-alex");
  });

  it("rejects missing required fields", async () => {
    const response = await createEvent({
      title: "Incomplete Event",
    });

    expect(response.status).to.equal(400);
  });

  it("rejects impossible dates", async () => {
    const response = await createEvent({
      ...validEvent,
      date: "2026-02-30",
    });

    expect(response.status).to.equal(400);
  });

  it("rejects invalid event times", async () => {
    const response = await createEvent({
      ...validEvent,
      startTime: "18:00",
      endTime: "14:00",
    });

    expect(response.status).to.equal(400);
  });

  it("rejects invalid timezones", async () => {
    const response = await createEvent({
      ...validEvent,
      timezone: "Invalid/Timezone",
    });

    expect(response.status).to.equal(400);
  });

  it("normalizes category aliases", async () => {
    const gaming = await createEvent({
      ...validEvent,
      category: "Gaming",
    });

    const arts = await createEvent({
      ...validEvent,
      category: "Arts",
    });

    expect(gaming.status).to.equal(201);
    expect(gaming.body.category).to.equal("Games");
    expect(arts.status).to.equal(201);
    expect(arts.body.category).to.equal("Art");
  });

  it("preserves a submitted image URL", async () => {
    const imageUrl = "https://example.com/event.png";

    const response = await createEvent({
      ...validEvent,
      imageUrl,
    });

    expect(response.status).to.equal(201);
    expect(response.body.imageUrl).to.equal(imageUrl);
  });
});
