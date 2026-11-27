import { expect } from "chai";
import request from "supertest";
import app from "../src/app.js";
import { resetStore, store } from "../src/data/store.js";
import { readFileSync } from "node:fs";

const host = "user-alex";
const firstGuest = "user-jordan";
const existingEvent = "/api/events/event-1";
const photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf7sAAAAASUVORK5CYII=";
const api = (method, path, user = host) => request(app)[method](path).set("Mock-User-Id", user);
const fixture = {
  title: "D5 event", description: "Learn printmaking.", date: "2030-06-10",
  startTime: "13:00", endTime: "14:00", category: "Art", location: "Queens",
};

describe("[Alpartun] Post-D4 functional completion", () => {
  beforeEach(() => resetStore());

  it("publishes versioned worldwide timezone options and country and alias mappings", async () => {
    const { body } = await request(app).get("/api/events/timezones").expect(200);
    expect(Object.keys(body.zones)).to.have.length.above(400);
    expect(body.zones["Europe/Paris"]).to.include("FR");
    expect(body.zones["Europe/Istanbul"]).to.include("TR");
    expect(body.aliases.Turkey).to.equal("Europe/Istanbul");
    expect(body.aliases["Asia/Calcutta"]).to.equal("Asia/Kolkata");
  });

  it("canonicalizes aliases without converting the calendar date or wall clock", async () => {
    const { body } = await api("post", "/api/events").send({ ...fixture, timezone: "Turkey" }).expect(201);
    expect(body).to.include({ timezone: "Europe/Istanbul", date: fixture.date, startTime: fixture.startTime });
    const changes = { timezone: "asia/calcutta" };
    const edited = await api("patch", `/api/events/${body.id}`).send(changes).expect(200);
    expect(edited.body).to.include({ timezone: "Asia/Kolkata", endTime: fixture.endTime });
    await api("patch", `/api/events/${body.id}`).send({ timezone: "+02:00" }).expect(400);
  });

  it("accepts, replaces, and clears event images with an existing default URL", async () => {
    const created = await api("post", "/api/events").send({ ...fixture, imageUrl: photo }).expect(201);
    const path = `/api/events/${created.body.id}`;
    expect(created.body.imageUrl).to.equal(photo);
    const images = JSON.parse(readFileSync(new URL("./fixtures/profile-images.json", import.meta.url)));
    const png = Object.values(images).find((value) => typeof value === "string" && value.startsWith("data:image/png;"));
    const replacement = png ?? "https://example.com/event.png";
    expect((await api("patch", path).send({ imageUrl: replacement }).expect(200)).body.imageUrl).to.equal(replacement);
    expect((await api("patch", path).send({ imageUrl: "" }).expect(200)).body.imageUrl).to.equal("/static/images/event-default.svg");
  });

  it("rejects invalid and oversized images atomically and applies organizer authorization", async () => {
    const before = structuredClone(store.events[0]);
    for (const imageUrl of [null, "data:image/png;base64,ZHVtbXk=", "/static/images/../secret.png", "https://example.com/" + "a".repeat(98_304)]) {
      await api("patch", existingEvent).send({ imageUrl, title: "Discard" }).expect(400);
    }
    await api("patch", existingEvent, firstGuest).send({ imageUrl: photo }).expect(403);
    await api("post", "/api/events").send({ ...fixture, imageUrl: "data:image/png;base64,d29yZA==" }).expect(400);
    expect(store.events[0]).to.deep.equal(before);
  });

});
