import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect } from "chai";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetStore } from "../src/data/store.js";

describe('[Alpartun] HTTP parser, profile atomicity, and static responses', () => {
  let directory;
  let client;

  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "doin-http-test-"));
    const clientDirectory = path.join(directory, "client");
    const publicDirectory = path.join(directory, "public");
    await Promise.all([mkdir(clientDirectory), mkdir(publicDirectory)]);
    await Promise.all([
      writeFile(path.join(clientDirectory, "index.html"), "<main>Test SPA</main>"),
      writeFile(path.join(publicDirectory, "avatar.txt"), "Test asset"),
    ]);
    client = request(createApp({ clientDirectory, publicDirectory }));
  });

  beforeEach(resetStore);
  after(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  const profilePath = "/api/users/user-alex";
  const errorBody = (code, message) => ({ error: { code, message } });

  it("returns the standard error for malformed JSON before any profile mutation", async () => {
    const original = await client.get(profilePath);
    const result = await client.patch(profilePath).set("Mock-User-Id", "user-alex")
      .type("json").send('{"bio":"changed",');
    expect(result.status).to.equal(400);
    expect(result.type).to.equal("application/json");
    expect(result.body).to.deep.equal(errorBody("INVALID_JSON", "The request body must contain valid JSON."));
    expect((await client.get(profilePath)).body).to.deep.equal(original.body);
  });

  it("rejects a profile request beyond the unchanged 100 KB JSON limit atomically", async () => {
    const original = await client.get(profilePath);
    const result = await client.patch(profilePath).set("Mock-User-Id", "user-alex")
      .send({ name: "changed", imageUrl: "A".repeat(103_000) });
    expect(result.status).to.equal(413);
    expect(result.body).to.deep.equal(errorBody("PAYLOAD_TOO_LARGE", "The request body is too large."));
    expect((await client.get(profilePath)).body).to.deep.equal(original.body);
  });

  it("rejects nonobject payloads and invalid profile field types without applying other changes", async () => {
    const original = await client.get(profilePath);
    for (const fields of [[], { name: 42 }, { name: "changed", bio: 42 }, { bio: "changed", location: null }]) {
      const result = await client.patch(profilePath).set("Mock-User-Id", "user-alex").send(fields);
      expect(result.status).to.equal(400);
      expect(result.body.error.code).to.equal("VALIDATION_ERROR");
      expect((await client.get(profilePath)).body).to.deep.equal(original.body);
    }
  });

  it("serves existing static assets and HTML deep links", async () => {
    await client.get("/static/avatar.txt").expect(200, "Test asset");
    await client.get("/events/example").accept("html").expect(200, "<main>Test SPA</main>");
    await client.get("/unknown-client-page").accept("html").expect(200, "<main>Test SPA</main>");
  });

  it("keeps missing API and static assets as JSON 404s, including when HTML is accepted", async () => {
    for (const url of ["/api/unknown", "/static/missing.txt", "/assets/missing.js"]) {
      const result = await client.get(url).accept("html");
      expect(result.status).to.equal(404);
      expect(result.type).to.equal("application/json");
      expect(result.body).to.deep.equal(errorBody("NOT_FOUND", "The requested resource was not found."));
    }
    await client.get("/unknown-client-page").accept("json").expect(404);
  });
});
