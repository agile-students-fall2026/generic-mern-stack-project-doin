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

  it("blocks host RSVP and leave while legacy host entries never occupy a guest place", async () => {
    const stored = store.events[0];
    stored.attendeeIds = [stored.organizerId];
    stored.capacity = 1;
    for (const method of ["post", "delete"]) {
      const { body } = await api(method, existingEvent + "/rsvp", stored.organizerId).expect(403);
      expect(body.error.code).to.equal("ORGANIZER_CANNOT_RSVP");
    }
    expect((await request(app).get(existingEvent)).body.attendeeIds).to.deep.equal([]);
    expect((await request(app).get("/api/events")).body[0].attendeeIds).to.deep.equal([]);
    expect((await api("get", `/api/users/${stored.organizerId}/events?type=joined`, stored.organizerId)).body).to.deep.equal([]);
    const joined = await api("post", existingEvent + "/rsvp", firstGuest).expect(200);
    expect(joined.body.attendeeIds).to.deep.equal([firstGuest]);
  });

  it("allows capacity increases and reductions down to the current guest count", async () => {
    const stored = store.events[0];
    stored.attendeeIds = [stored.organizerId, firstGuest];
    const increased = await api("patch", existingEvent, stored.organizerId).send({ capacity: 30 }).expect(200);
    expect(increased.body.capacity).to.equal(30);
    const lowered = await api("patch", existingEvent, stored.organizerId).send({ capacity: 1 }).expect(200);
    expect(lowered.body.capacity).to.equal(1);
  });

  it("atomically rejects capacity below current guests and invalid capacity values", async () => {
    const stored = store.events[0];
    stored.attendeeIds = [stored.organizerId, firstGuest, "user-sam"];
    const before = structuredClone(stored);
    const { body } = await api("patch", existingEvent, stored.organizerId).send({ title: "Discard", capacity: 1 }).expect(409);
    expect(body.error.code).to.equal("CAPACITY_BELOW_GUEST_COUNT");
    for (const capacity of [0, 1.5, "4", null]) {
      await api("patch", existingEvent, stored.organizerId).send({ capacity }).expect(400);
    }
    expect(stored).to.deep.equal(before);
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
    await api("patch", existingEvent, firstGuest).send({ imageUrl: photo, capacity: 3 }).expect(403);
    await api("post", "/api/events").send({ ...fixture, imageUrl: "data:image/png;base64,d29yZA==" }).expect(400);
    expect(store.events[0]).to.deep.equal(before);
  });

  it("reports public aggregate stats without exposing other users' relationship lists", async () => {
    const event = store.events[0];
    event.attendeeIds = [event.organizerId, firstGuest];
    const hostProfile = await request(app).get(`/api/users/${event.organizerId}`).expect(200);
    expect(hostProfile.body.stats).to.include({ hosted: 1, attended: 0 });
    const guest = await request(app).get(`/api/users/${firstGuest}`).expect(200);
    expect(guest.body.stats).to.include({ attended: 1 });
    expect(guest.body).not.to.have.any.keys("connectionRequests", "connectedUsers", "email");
    await api("get", `/api/users/${firstGuest}/connections`).expect(403);
    await api("delete", existingEvent, event.organizerId).expect(200);
    expect((await request(app).get(`/api/users/${firstGuest}`)).body.stats.attended).to.equal(0);
  });

  for (const disconnecting of [host, firstGuest]) {
    it(`allows ${disconnecting} to disconnect, updates both counts, and permits a new request`, async () => {
      const sent = await api("post", "/api/connections/requests").send({ recipientId: firstGuest }).expect(201);
      await api("patch", `/api/connections/requests/${sent.body.id}`, firstGuest).send({ status: "accepted" }).expect(200);
      const other = disconnecting === host ? firstGuest : host;
      const path = `/api/users/${disconnecting}/connections/${other}`;
      const outsider = store.users.find((user) => ![host, firstGuest].includes(user.id)).id;
      await request(app).delete(path).expect(401);
      await api("delete", path, outsider).expect(403);
      await api("delete", path, disconnecting).expect(204);
      await api("delete", path, disconnecting).expect(404);
      for (const id of [host, firstGuest]) {
        expect((await api("get", `/api/users/${id}/connections`, id)).body).to.deep.equal([]);
        expect((await request(app).get(`/api/users/${id}`)).body.stats.connections).to.equal(0);
      }
      await api("post", "/api/connections/requests", other).send({ recipientId: disconnecting }).expect(201);
    });
  }
});
