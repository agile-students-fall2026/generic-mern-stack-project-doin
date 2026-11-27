import { readFileSync } from "node:fs";
import { expect } from "chai";
import request from "supertest";
import app from "../src/app.js";
import { resetStore } from "../src/data/store.js";

const imageFixtures = JSON.parse(readFileSync(new URL("./fixtures/profile-images.json", import.meta.url), "utf8"));
const { png } = imageFixtures;
const profilePath = "/api/users/user-alex";

const getProfile = () => request(app).get(profilePath);
const patchProfile = (fields) => request(app).patch(profilePath)
  .set("Mock-User-Id", "user-alex").send(fields);

describe('[Alpartun] Profile image validation', () => {
  beforeEach(resetStore);

  it("keeps the existing seeded HTTPS photo and allows legitimate image paths and clearing a photo", async () => {
    expect((await getProfile()).body.imageUrl).to.match(/^https:\/\//);
    for (const imageUrl of ["https://images.example.com/avatar.png", "http://images.example.com/old.jpg", "/static/images/avatar.jpg", ""]) {
      const result = await patchProfile({ imageUrl });
      expect(result.status).to.equal(200);
      expect(result.body.imageUrl).to.equal(imageUrl);
    }
  });

  it("accepts supported image data during profile setup", async () => {
    const registration = await request(app).post("/api/auth/register")
      .send({ name: "Image Test", email: "image@example.test", password: "Passw0rd!" });
    expect(registration.status).to.equal(201);
    const setup = await request(app).post("/api/profiles").set("Mock-User-Id", registration.body.id)
      .send({ username: "image_test", imageUrl: png });
    expect(setup.status).to.equal(200);
    expect(setup.body.imageUrl).to.equal(png);
  });

  for (const [format, imageUrl] of Object.entries(imageFixtures)) {
    it(`preserves a valid ${format.toUpperCase()} data URL on update`, async () => {
      const result = await patchProfile({ imageUrl });
      expect(result.status).to.equal(200);
      expect(result.body.imageUrl).to.equal(imageUrl);
      expect((await getProfile()).body.imageUrl).to.equal(imageUrl);
    });
  }

  const invalidValues = [
    ["invalid base64", "data:image/png;base64,!!!"],
    ["noncanonical base64", png + "="],
    ["a mismatched MIME type", png.replace("image/png", "image/jpeg")],
    ["truncated image data", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE="],
    ["an unsupported data format", "data:image/svg+xml;base64,PHN2Zy8+"],
    ["a script URL", "javascript:alert(1)"],
    ["a local file URL", "file:///tmp/photo.png"],
    ["a malformed HTTPS reference", "https:images.example.com/avatar.png"],
    ["a URL containing credentials", "https://alice:password@images.example.com/avatar.png"],
    ["a protocol-relative reference", "//images.example.com/avatar.png"],
    ["an invalid HTTPS URL", "https://[example]/avatar.png"],
    ["a nonstring image", { url: "/avatar.png" }],
    ["an over-limit image value inside an otherwise valid request", "data:image/png;base64," + "A".repeat(99_000)],
  ];

  for (const [description, imageUrl] of invalidValues) {
    it(`rejects ${description} without changing the name, bio or photo`, async () => {
      const original = (await getProfile()).body;
      const result = await patchProfile({ name: "Changed", bio: "Changed", imageUrl });
      expect(result.status).to.equal(400);
      expect(result.body.error).to.include({ code: "VALIDATION_ERROR" });
      expect((await getProfile()).body).to.deep.equal(original);
    });
  }

  it("leaves onboarding incomplete if profile setup contains an invalid image", async () => {
    const registration = await request(app).post("/api/auth/register")
      .send({ name: "New User", email: "newimage@example.test", password: "Passw0rd!" });
    const userId = registration.body.id;
    const setup = await request(app).post("/api/profiles").set("Mock-User-Id", userId)
      .send({ username: "badphoto", bio: "Should not persist", imageUrl: "not-an-image-url" });
    expect(setup.status).to.equal(400);
    expect(setup.body.error.code).to.equal("VALIDATION_ERROR");
    const profile = await request(app).get(`/api/users/${userId}`);
    expect(profile.body).to.deep.equal(registration.body);
  });
});
