const assert = require("node:assert/strict");
const { once } = require("node:events");
const { existsSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const buildDirectory = path.resolve(process.env.DOIN_CLIENT_DIR ?? path.join(root, "front-end/dist"));
const password = "DoinBrowser1!";
const viewport = { width: 393, height: 852 };
const credentials = [
  { name: "Browser Alice", email: "browser-alice@example.test", username: "browser_alice" },
  { name: "Browser Bob", email: "browser-bob@example.test", username: "browser_bob" },
];

const heading = (page, name) => page.getByRole("heading", { name, exact: true }).waitFor();
const button = (page, name) => page.getByRole("button", { name, exact: true });
const link = (page, name) => page.getByRole("link", { name, exact: true });
const message = (page, text) => page.getByText(text, { exact: true }).first().waitFor();
const nav = (page, name) => page.locator(".navbar").getByRole("link", { name, exact: true }).click();
const focus = (page) => page.evaluate(() => window.dispatchEvent(new Event("focus")));
const submit = (page) => page.locator("form button[type=submit]");
let origin;

async function api(page, method, pathname, status, data) {
  const userId = await page.evaluate(() => sessionStorage.getItem("doin.currentUserId"));
  const response = await page.request.fetch(origin + pathname, {
    method,
    data,
    headers: userId ? { "Mock-User-Id": userId } : {},
  });
  assert.equal(response.status(), status, pathname);
  return response.json();
}

async function browserRequest(page, method, pathname, status, trigger) {
  const [response] = await Promise.all([
    page.waitForResponse((result) =>
      new URL(result.url()).pathname === pathname && result.request().method() === method),
    trigger(),
  ]);
  assert.equal(response.status(), status, pathname);
  return response;
}

async function register(page, account) {
  await page.goto(origin + "/register");
  for (const [id, value] of Object.entries({
    fullName: account.name, email: account.email, password, confirmPassword: password,
  })) {
    await page.locator("#" + id).fill(value);
  }
  const result = await browserRequest(page, "POST", "/api/auth/register", 201, () => submit(page).click());
  await heading(page, "Your interests");
  return result.json();
}

async function fillSetup(page, username) {
  await heading(page, "Set up your profile");
  await page.locator("#username").fill(username);
  await page.locator("#bio").fill("Coffee, art, and walks.");
  await page.locator("#location").fill("New York");
}

async function retryCatalog(page, pathname, label, visit, whileUnavailable) {
  const fail = (route) => route.fulfill({
    status: 503,
    json: { error: { code: "TEMPORARY", message: "Catalog temporarily unavailable." } },
  });
  await page.route("**" + pathname, fail);
  try {
    await visit();
    await page.getByRole("alert").filter({ hasText: label + " could not be loaded." }).waitFor();
    await whileUnavailable();
  } finally {
    await page.unroute("**" + pathname, fail);
  }
  await browserRequest(page, "GET", pathname, 200, () => button(page, "Retry " + label.toLowerCase()).click());
}

async function jpeg(page, width, height, quality) {
  const base64 = await page.evaluate(({ width, height, quality }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(width, height);
    let random = 177;
    for (let i = 0; i < pixels.data.length; i += 4) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      pixels.data[i] = (x * 2 + (random >>> 24)) % 256;
      pixels.data[i + 1] = (y * 2 + ((random >>> 16) & 255)) % 256;
      pixels.data[i + 2] = (x + y + ((random >>> 8) & 255)) % 256;
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/jpeg", quality).split(",")[1];
  }, { width, height, quality });
  return Buffer.from(base64, "base64");
}

// Add legal JPEG comments so the size-limit fixtures have a precise byte count.
function padJpeg(image, size) {
  const chunks = [image.subarray(0, 2)];
  let remaining = size - image.length;
  assert(remaining >= 4, "fixture pixels should fit below the requested size");
  while (remaining > 0) {
    let length = Math.min(remaining, 65_537);
    if (remaining > length && remaining - length < 4) length -= 4;
    const comment = Buffer.alloc(length);
    comment.writeUInt16BE(0xfffe);
    comment.writeUInt16BE(length - 2, 2);
    chunks.push(comment);
    remaining -= length;
  }
  chunks.push(image.subarray(2));
  return Buffer.concat(chunks);
}

const imageFile = (buffer) => ({ name: "profile.jpg", mimeType: "image/jpeg", buffer });

async function preview(page, selector, previous = "") {
  await page.waitForFunction(({ selector, previous }) => {
    const image = document.querySelector(selector);
    return image && !image.hasAttribute("data-avatar-fallback") && image.src !== previous && image.naturalWidth > 0;
  }, { selector, previous });
  return page.locator(selector).evaluate((image) => ({
    url: image.src,
    dimensions: [image.naturalWidth, image.naturalHeight],
  }));
}

function measureImage(name, source, encoded, request, originalRatio) {
  const body = request.request().postDataBuffer();
  assert(body.length <= 102_400, "actual UTF-8 request must fit Express's limit");
  assert(encoded.url.length <= 90 * 1024);
  assert(Math.max(...encoded.dimensions) <= 640);
  assert(Math.abs(encoded.dimensions[0] / encoded.dimensions[1] - originalRatio) < 0.02);
  console.log(JSON.stringify({
    name, sourceBytes: source.length, dataUrlBytes: encoded.url.length,
    bodyBytes: body.length, dimensions: encoded.dimensions,
    mediaType: encoded.url.split(";")[0].slice(5),
  }));
}

async function assertTextFits(page, selector, expected) {
  const element = page.locator(selector).filter({ hasText: expected }).first();
  await element.waitFor();
  const result = await element.evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(node);
    const text = range.getBoundingClientRect();
    return {
      doc: document.documentElement.scrollWidth, viewport: innerWidth,
      clipped: text.left < bounds.left - 2 || text.right > bounds.right + 2,
    };
  });
  assert.equal(result.doc, result.viewport, selector);
  assert.equal(result.clipped, false, selector + " clips long text");
  assert((await element.textContent()).includes(expected), selector);
}

async function main() {
  assert(existsSync(path.join(buildDirectory, "index.html")), "Build the frontend first or set DOIN_CLIENT_DIR.");
  let chromium;
  try {
    ({ chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright"));
  } catch (error) {
    throw new Error("Use an existing Playwright installation via PLAYWRIGHT_MODULE. See back-end/TESTING.md.", { cause: error });
  }
  const { createApp } = await import(pathToFileURL(path.join(root, "back-end/src/app.js")));
  const server = createApp({ clientDirectory: buildDirectory }).listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;

  let browser;
  const pageErrors = [];
  const unexpectedFailures = [];
  let passed = 0;
  async function scenario(name, run) {
    await run();
    passed++;
    console.log("PASS " + name);
  }

  try {
    browser = await chromium.launch({ headless: true });
    const contexts = await Promise.all([0, 1, 2].map(() =>
      browser.newContext({ viewport, isMobile: true, hasTouch: true })));
    const [alice, bob, visitor] = await Promise.all(contexts.map((context) => context.newPage()));
    await visitor.addInitScript((appOrigin) => {
      if (location.origin === appOrigin) sessionStorage.setItem("doin.currentUserId", "user-sam");
    }, origin);
    for (const [index, page] of [alice, bob, visitor].entries()) {
      page.setDefaultTimeout(6500);
      await contexts[index].route("**/*", (route) =>
        new URL(route.request().url()).origin === origin ? route.continue() : route.abort("blockedbyclient"));
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("response", (response) => {
        const url = new URL(response.url());
        const allowed = ["/api/interests", "/api/events/categories"];
        if (url.origin === origin && response.status() >= 400
          && !(response.status() === 503 && allowed.includes(url.pathname))) {
          unexpectedFailures.push(`${response.status()} ${url.pathname}`);
        }
      });
      page.on("requestfailed", (request) => {
        if (new URL(request.url()).origin === origin && request.failure()?.errorText !== "net::ERR_ABORTED") {
          unexpectedFailures.push(`${request.failure()?.errorText} ${request.url()}`);
        }
      });
    }

    await alice.goto(origin);
    const interests = await api(alice, "GET", "/api/interests", 200);
    const categories = await api(alice, "GET", "/api/events/categories", 200);
    let aliceId;
    let bobId;
    let savedPhoto;
    let event;

    await scenario("authentication guards, unknown signed-out and onboarding routes", async () => {
      await alice.goto(origin + "/missing-page");
      await heading(alice, "Page not found");
      assert.equal(await alice.locator(".navbar").count(), 0);
      await link(alice, "Go to Welcome").click();
      await heading(alice, "Meet people. Do things together.");
      await alice.goto(origin + "/events/event-1");
      await heading(alice, "Welcome back");
      aliceId = (await register(alice, credentials[0])).id;
      await alice.goto(origin + "/missing-onboarding");
      await heading(alice, "Page not found");
      await link(alice, "Continue setup").click();
      await heading(alice, "Your interests");
    });

    await scenario("onboarding uses the canonical interest catalog and recovers from failure", async () => {
      await retryCatalog(alice, "/api/interests", "Interests",
        () => alice.reload(), async () => assert(await button(alice, "Skip").isDisabled()));
      await alice.locator(".interests-grid button").first().waitFor();
      assert.deepEqual(await alice.locator(".interests-grid button").allTextContents(), interests);
      await button(alice, "Games").click();
      await alice.locator(".interests-next").click();
      await fillSetup(alice, credentials[0].username);
    });

    await scenario("exact 298 KB JPEG is resized, previewed, and survives profile setup", async () => {
      const source = padJpeg(await jpeg(alice, 800, 600, 0.34), 298_000);
      await alice.evaluate(() => {
        const decodeImage = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = function () {
          if (!this.src.startsWith("blob:")) return decodeImage.call(this);
          return new Promise((resolve) => {
            window.resumePhotoDecode = () => {
              HTMLImageElement.prototype.decode = decodeImage;
              resolve(decodeImage.call(this));
            };
          });
        };
      });
      await alice.locator("#profile-photo").setInputFiles(imageFile(source));
      await message(alice, "Processing photo…");
      assert(await submit(alice).isDisabled());
      await alice.waitForFunction(() => typeof window.resumePhotoDecode === "function");
      await alice.evaluate(() => window.resumePhotoDecode());
      const encoded = await preview(alice, ".setup-profile-avatar");
      const response = await browserRequest(alice, "POST", "/api/profiles", 200, () => submit(alice).click());
      measureImage("298 KB setup", source, encoded, response, 800 / 600);
      assert.equal((await response.json()).imageUrl, encoded.url);
      await heading(alice, "My Profile");
      assert.equal((await preview(alice, ".user-profile-photo")).url, encoded.url);
      savedPhoto = encoded.url;

      bobId = (await register(bob, credentials[1])).id;
      await button(bob, "Skip").click();
      await fillSetup(bob, credentials[1].username);
      await submit(bob).click();
      await heading(bob, "My Profile");
    });

    await scenario("large replacement persists and invalid, corrupt, and oversized selections preserve it", async () => {
      await link(alice, "Edit Profile").click();
      const picker = alice.locator("input[type=file]");
      await preview(alice, ".edit-profile-avatar");
      const source = await jpeg(alice, 1920, 1440, 0.96);
      assert(source.length > 298_000 && source.length < 5_000_000);
      await picker.setInputFiles(imageFile(source));
      const encoded = await preview(alice, ".edit-profile-avatar", savedPhoto);

      for (const [file, error] of [
        [{ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("not a photo") },
          "Choose a JPEG, PNG, WebP, GIF, AVIF, or BMP image."],
        [imageFile(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])), "This photo could not be opened. Choose a valid image file."],
        [imageFile(padJpeg(source, 5_000_001)), "Choose a photo up to 5 MB."],
      ]) {
        await picker.setInputFiles(file);
        await message(alice, error);
        assert.equal((await preview(alice, ".edit-profile-avatar")).url, encoded.url);
      }

      await alice.locator("#bio_field").fill("Multibyte text preserved 🌱");
      const result = await browserRequest(alice, "PATCH", `/api/users/${aliceId}`, 200, () => submit(alice).click());
      measureImage("large replacement", source, encoded, result, 1920 / 1440);
      assert.equal((await result.json()).imageUrl, encoded.url);
      await heading(alice, "My Profile");
      assert.equal((await preview(alice, ".user-profile-photo")).url, encoded.url);
      savedPhoto = encoded.url;
    });

    await scenario("encoded accounting includes UTF-8 profile fields on submit", async () => {
      await link(alice, "Edit Profile").click();
      await preview(alice, ".edit-profile-avatar");
      let saves = 0;
      function countSave(request) {
        if (request.method() === "PATCH" && new URL(request.url()).pathname === `/api/users/${aliceId}`) saves++;
      }
      alice.on("request", countSave);
      try {
        await alice.locator("#bio_field").fill("界".repeat(35_000));
        await submit(alice).click();
        await message(alice, "The profile and photo are too large together. Shorten the profile text or choose a smaller photo.");
        assert.equal(saves, 0);
        assert.equal((await api(alice, "GET", `/api/users/${aliceId}`, 200)).imageUrl, savedPhoto);
      } finally {
        alice.off("request", countSave);
      }
      await link(alice, "Back to profile").click();
      await heading(alice, "My Profile");
    });

    await scenario("profile editing and People expose all existing interests and recover their catalogs", async () => {
      await retryCatalog(alice, "/api/interests", "Interests", () => link(alice, "Edit Profile").click(),
        () => message(alice, "Games"));
      await alice.locator(".edit-profile-interests button").first().waitFor();
      assert.deepEqual(await alice.locator(".edit-profile-interests button").allTextContents(), interests);
      assert.equal(await button(alice, "Games").getAttribute("aria-pressed"), "true");
      await retryCatalog(alice, "/api/interests", "Interests", () => nav(alice, "People"), async () => {
        await heading(alice, credentials[1].name);
        assert.equal(await alice.getByRole("checkbox", { name: "Games", exact: true }).count(), 0);
      });
      await alice.locator(".browse-filters summary").click();
      await alice.getByRole("checkbox", { name: "Games", exact: true }).waitFor();
      assert.deepEqual(await alice.locator(".browse-filter-choice span").allTextContents(), interests);
      assert.equal(await alice.getByLabel("Search by name or username").count(), 1);
      await alice.getByRole("checkbox", { name: "Games", exact: true }).check();
      await heading(alice, "Taylor Brooks");
    });

    await scenario("connection request and acceptance revalidate across independent sessions", async () => {
      await nav(bob, "Connect");
      await heading(bob, "Incoming requests");
      await alice.getByRole("button", { name: "Clear filters", exact: true }).click();
      const card = alice.locator(".person-card").filter({ hasText: credentials[1].name });
      await card.click();
      await button(alice, "Send connection request").click();
      await button(alice, "Cancel request").waitFor();
      await focus(bob);
      await button(bob, "Accept").click();
      await link(bob, `View ${credentials[0].name}'s profile`).waitFor();
      await focus(alice);
      await message(alice, "Connected");
      assert.equal((await api(bob, "GET", `/api/users/${bobId}/connections`, 200))[0].id, aliceId);
    });

    await scenario("canonical categories in Discover, Create, and Edit with form retry", async () => {
      await nav(alice, "Events");
      await alice.locator(".event-filters summary").click();
      await alice.getByRole("radio", { name: "Games", exact: true }).waitFor();
      assert.deepEqual((await alice.locator(".browse-filter-choice span").allTextContents()).slice(1), categories);
      await retryCatalog(alice, "/api/events/categories", "Categories",
        () => link(alice, "Create event").click(), async () => {
          assert(await submit(alice).isDisabled());
          await alice.locator("#event-title").fill("Long content layout event");
        });
      await alice.locator("#event-category option").nth(categories.length).waitFor({ state: "attached" });
      assert.deepEqual((await alice.locator("#event-category option").allTextContents()).slice(1), categories);
      assert.equal(await alice.locator("#event-title").inputValue(), "Long content layout event");
      for (const [field, value] of Object.entries({
        description: "A test event", date: "2026-12-06", start: "12:00",
        end: "14:00", location: "New York", capacity: "10",
      })) {
        await alice.locator("#event-" + field).fill(value);
      }
      await alice.locator("#event-category").selectOption("Art");
      const created = await browserRequest(alice, "POST", "/api/events", 201, () => submit(alice).click());
      event = await created.json();
      await heading(alice, event.title);
      await link(alice, "Edit Event").click();
      await alice.locator("#event-category option").nth(categories.length).waitFor({ state: "attached" });
      assert.deepEqual((await alice.locator("#event-category option").allTextContents()).slice(1), categories);
      assert.equal(await alice.locator("#event-category").inputValue(), "Art");
      await alice.locator("#event-category").selectOption("Games");
      await browserRequest(alice, "PATCH", `/api/events/${event.id}`, 200, () => submit(alice).click());
      await heading(alice, event.title);
      assert.equal((await api(alice, "GET", `/api/events/${event.id}`, 200)).category, "Games");
      await bob.goto(origin + `/events/${event.id}`);
      await heading(bob, event.title);
      await button(bob, "Join Event").click();
      await browserRequest(bob, "POST", `/api/events/${event.id}/rsvp`, 200, () => button(bob, "Confirm RSVP").click());
      await button(bob, "Leave Event").waitFor();
    });

    const name = "LongName" + "W".repeat(110);
    const username = "LongUser" + "u".repeat(100);
    const bio = "ProfileBio" + "b".repeat(200);
    const location = "FarAway" + "l".repeat(155);
    const title = "LongTitle" + "T".repeat(108);
    const description = "FullDescription" + "D".repeat(220);

    await api(alice, "PATCH", `/api/users/${aliceId}`, 200, { name, username, bio, location });
    await api(alice, "PATCH", `/api/events/${event.id}`, 200, { title, description, location });
    for (const width of [320, 375, 393, 430, 1280]) {
      await scenario(`untruncated event and profile content at ${width} CSS px`, async () => {
        await bob.setViewportSize({ width, height: 852 });
        await bob.goto(origin + "/events");
        await assertTextFits(bob, ".event-card h2", title);
        await assertTextFits(bob, ".event-card-location span", location);
        await link(bob, title).click();
        await assertTextFits(bob, ".event-details-content h1", title);
        await assertTextFits(bob, ".event-description", description);
        await assertTextFits(bob, ".event-info .event-location", location);
        await nav(bob, "Events");
        await link(bob, "My Events").click();
        await assertTextFits(bob, ".my-event-card h2", title);
        await assertTextFits(bob, ".my-event-card .event-card-location span", location);
        // Bob and Alice are connected. Check discovery layout as an unconnected visitor.
        await visitor.setViewportSize({ width, height: 852 });
        await visitor.goto(origin + "/discover");
        await assertTextFits(visitor, ".person-info h2", name);
        await visitor.locator(".person-card").filter({ hasText: name }).click();
        await assertTextFits(visitor, ".user-profile-name", name);
        await assertTextFits(visitor, ".user-profile-username", username);
        await assertTextFits(visitor, ".user-profile-location", location);
        await assertTextFits(visitor, ".user-profile-section p", bio);
        await nav(bob, "Connect");
        await assertTextFits(bob, ".connection-profile-link span", name);
      });
    }

    await scenario("signed-in fallback, cancellation refresh, and logout preserve session boundaries", async () => {
      await bob.goto(origin + "/missing-signed-in");
      await heading(bob, "Page not found");
      await link(bob, "Go to Discover People").click();
      await heading(bob, "Discover People");
      await bob.goto(origin + `/events/${event.id}`);
      await heading(bob, title);
      await api(alice, "DELETE", `/api/events/${event.id}`, 200);
      await focus(bob);
      await message(bob, "This event was canceled.");
      await nav(bob, "Profile");
      await button(bob, "Log Out").click();
      await heading(bob, "Meet people. Do things together.");
      await bob.goBack();
      await heading(bob, "Meet people. Do things together.");
      assert.equal(await bob.locator(".navbar").count(), 0);
      assert.equal((await api(alice, "GET", "/api/users/me", 200)).id, aliceId);
    });

    assert.deepEqual(pageErrors, [], "uncaught browser errors");
    assert.deepEqual(unexpectedFailures, [], "unexpected local network failures");
    console.log(`${passed} browser scenarios passed with zero uncaught errors or unexpected HTTP failures.`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
