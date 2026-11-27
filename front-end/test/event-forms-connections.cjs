const assert = require("node:assert/strict");
const { once } = require("node:events");
const { mkdir, mkdtemp, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const clientDirectory = path.resolve(process.env.DOIN_CLIENT_DIR ?? path.join(root, "front-end/dist"));
const viewport = { width: 393, height: 852 };
const draft = {
  title: "Coffee & Sketching",
  description: "Bring a sketchbook and spend an hour drawing over coffee. All experience levels are welcome. We’ll meet by the front entrance.",
  date: "2026-11-28",
  startTime: "10:30",
  endTime: "12:00",
  location: "Washington Square Park",
  category: "Art",
  capacity: 2,
};
const fieldIds = {
  title: "title", description: "description", date: "date", startTime: "start", endTime: "end",
  location: "location", category: "category", capacity: "capacity",
};
const password = "DoinBrowser1!";
const scenarios = [];
const review = [];
const measurements = {};
const errors = [];
const httpFailures = [];
let origin;
let output;

const heading = (page, name) => page.getByRole("heading", { name, exact: true });
const button = (scope, name) => scope.getByRole("button", { name, exact: true });
const link = (scope, name) => scope.getByRole("link", { name, exact: true });
const words = (scope, text) => scope.getByText(text, { exact: true });
const form = (page) => page.locator(".create-event-form");
const field = (page, key) => page.locator("#event-" + (fieldIds[key] ?? key));
const toast = (page) => page.getByRole("region", { name: "Notification" });
const section = (page, title) => page.locator(".connections-section").filter({ has: heading(page, title) });
const personCard = (scope, name) => scope.locator(".connection-user")
  .filter({ has: link(scope.page?.() ?? scope, "View " + name + "'s profile") });

async function check(name, run) {
  await run();
  scenarios.push(name);
  console.log("PASS " + name);
}

async function api(context, method, route, status, user, data) {
  const response = await context.request.fetch(origin + "/api" + route, {
    method, headers: user ? { "Mock-User-Id": user } : {}, data,
  });
  assert.equal(response.status(), status, route + " " + await response.text());
  return response.json();
}

async function openSession(browser) {
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Los_Angeles" });
  await context.route("https://picsum.photos/**", (route) => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(6500);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400) {
      httpFailures.push([response.status(), new URL(response.url()).pathname]);
    }
  });
  return { page, context };
}

async function signIn(browser, name, username) {
  const session = await openSession(browser);
  const { page, context } = session;
  const email = username + "@example.test";
  session.user = await api(context, "POST", "/auth/register", 201, null, { name, email, password });
  await api(context, "POST", "/profiles", 200, session.user.id, { username, interests: ["Art"] });
  await visit(page, "/login", "Welcome back");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await button(page, "Log in").click();
  await heading(page, "Discover People").waitFor();
  return session;
}

async function visit(page, route, title) {
  await page.goto(origin + route);
  await heading(page, title).waitFor();
}

async function eventForm(page, route, editing = false) {
  await visit(page, route, editing ? "Edit Event" : "Create an Event");
  await field(page, "category").waitFor();
}

async function fillForm(page, values = draft) {
  for (const [key, value] of Object.entries(values)) {
    if (key === "category") await field(page, key).selectOption(value);
    else await field(page, key).fill(String(value));
  }
}

async function snapshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: path.join(output, name + ".png"), scale: "css" });
}

async function show(locator, block = "center") {
  await locator.evaluate((node, align) => node.scrollIntoView({ block: align }), block);
}

function measure(page) {
  return page.evaluate(() => {
    function box(selector) {
      const node = document.querySelector(selector);
      if (!node) return null;
      const { x, y, width, height, bottom, right } = node.getBoundingClientRect();
      return { x, y, width, height, bottom, right };
    }
    const nav = box(".navbar");
    const submit = box(".create-event-submit");
    const accept = box(".connection-accept");
    const decline = box(".connection-decline");
    return {
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      form: box(".create-event-form"), start: box("#event-start"), end: box("#event-end"),
      submit, nav, clearance: submit && nav ? nav.y - submit.bottom : null,
      incoming: box(".connection-request"), accept, decline,
      actionGap: accept && decline ? decline.x - accept.right : null,
    };
  });
}

function touch(box) {
  assert(box && box.width >= 44 && box.height >= 44, JSON.stringify(box));
}

async function assertFocused(locator) {
  assert(await locator.evaluate((node) => node === document.activeElement), await locator.textContent());
}

async function clearance(locator) {
  await locator.evaluate((node) => {
    node.scrollIntoView({ block: "end" });
  });
  const visible = await locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const notification = document.querySelector(".doin-toast")?.getBoundingClientRect();
    const nav = document.querySelector(".navbar")?.getBoundingClientRect();
    return rect.bottom <= (nav?.top ?? innerHeight) && (!notification || rect.top >= notification.bottom || rect.bottom <= notification.top);
  });
  assert(visible, "Control is obscured by navigation or toast");
}

async function responseTo(page, method, route, status, action) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => new URL(item.url()).pathname === "/api" + route &&
      item.request().method() === method),
    action(),
  ]);
  assert.equal(response.status(), status);
  return { body: await response.json(), request: response.request() };
}

function refresh(page, route) {
  return responseTo(page, "GET", route, 200, () => page.evaluate(() => window.dispatchEvent(new Event("focus"))));
}

async function clearToast(page, message) {
  await words(toast(page), message).waitFor();
  await button(toast(page), "Dismiss notification").click();
  await toast(page).waitFor({ state: "hidden" });
}

async function fitsText(locator, text) {
  assert.equal(await locator.textContent(), text);
  const fits = await locator.evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(node);
    const lines = [...range.getClientRects()];
    return lines.length > 1 && lines.every((line) => line.left >= bounds.left - 1 && line.right <= bounds.right + 1);
  });
  assert(fits, "Long text should wrap entirely inside the card");
}

async function main() {
  output = process.env.DOIN_BROWSER_OUTPUT_DIR ?? await mkdtemp(path.join(os.tmpdir(), "doin-forms-connections-"));
  await mkdir(output, { recursive: true });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const { createApp } = await import(pathToFileURL(path.join(root, "back-end/src/app.js")));
  const server = createApp({ clientDirectory }).listen(0, "127.0.0.1");
  let browser;
  try {
    await once(server, "listening");
    origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch();
    const owner = await signIn(browser, "Maya Rivera", "mayarivera");
    const sender = await signIn(browser, "Noah Bennett", "noahbennett");
    const empty = await signIn(browser, "Jordan Ellis", "jordanellis");
    const host = owner.page;
    const guest = sender.page;
    const fixture = await api(owner.context, "POST", "/events", 201, owner.user.id, draft);
    const fixtureRoute = "/events/" + fixture.id;
    const incoming = await api(sender.context, "POST", "/connections/requests", 201, sender.user.id, { recipientId: owner.user.id });
    const sent = await api(owner.context, "POST", "/connections/requests", 201, owner.user.id, { recipientId: "user-sam" });
    const accepted = await api(owner.context, "POST", "/connections/requests", 201, "user-jordan", { recipientId: owner.user.id });
    await api(owner.context, "PATCH", "/connections/requests/" + accepted.id, 200, owner.user.id, { status: "accepted" });

    await check("Create Event uses named groups and native date and time controls", async () => {
      await eventForm(host, "/create-event");
      for (const legend of ["Event information", "Date and time", "Location and attendance"]) {
        await form(host).getByRole("group", { name: legend, exact: true }).waitFor();
      }
      await snapshot(host, "create-top");
      measurements.create = await measure(host);
      assert.equal(await field(host, "date").getAttribute("type"), "date");
      assert.equal(await field(host, "startTime").getAttribute("type"), "time");
      assert.equal(await field(host, "endTime").getAttribute("type"), "time");
      assert.match(await field(host, "startTime").getAttribute("aria-describedby"), /event-timezone-hint/);
      await fillForm(host);
      await show(field(host, "date"));
      await snapshot(host, "create-schedule");
      const create = button(host, "Create Event");
      await clearance(create);
      measurements.createScrolled = await measure(host);
      await snapshot(host, "create-lower");
    });

    await check("native required date and reversed time produce linked inline feedback", async () => {
      const create = button(host, "Create Event");
      await field(host, "date").fill("");
      await create.click();
      await assertFocused(field(host, "date"));
      assert.equal(await field(host, "date").getAttribute("aria-invalid"), "true");
      assert.match(await field(host, "date").getAttribute("aria-describedby"), /event-field-error/);
      await host.locator(".event-date-display + [role=alert]").waitFor();
      await field(host, "date").fill(draft.date);
      await field(host, "endTime").fill("09:00");
      await create.click();
      await assertFocused(field(host, "endTime"));
      assert.equal(await host.locator("#event-end + [role=alert]").textContent(), "End time must be after start time.");
      assert.equal(await field(host, "endTime").getAttribute("aria-invalid"), "true");
      await snapshot(host, "create-invalid");
      await field(host, "endTime").fill(draft.endTime);
      assert.equal(await host.locator("#event-field-error").count(), 0);
    });

    await check("failed Create retains the draft and pending protects against a duplicate POST", async () => {
      let release;
      let observe;
      const held = new Promise((resolve) => { release = resolve; });
      const seen = new Promise((resolve) => { observe = resolve; });
      let attempts = 0;
      const inject = async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        attempts += 1;
        observe();
        await held;
        await route.fulfill({
          status: 503, json: { error: { code: "D4_TEST", message: "Create service unavailable. Please try again." } },
        });
      };
      await host.route("**/api/events", inject);
      try {
        await button(host, "Create Event").click();
        await seen;
        const saving = button(host, "Saving…");
        assert.equal(await saving.isDisabled(), true);
        assert.equal(await saving.getAttribute("aria-busy"), "true");
        await form(host).evaluate((node) => node.requestSubmit());
        assert.equal(attempts, 1);
      } finally {
        release();
      }
      await host.getByRole("alert").filter({ hasText: "Create service unavailable." }).waitFor();
      for (const [key, value] of Object.entries(draft)) {
        assert.equal(await field(host, key).inputValue(), String(value));
      }
      await host.unroute("**/api/events", inject);
      await snapshot(host, "create-service-error");
    });

    let createdRoute;
    await check("Create retries with the detected zone and shows a clearable toast", async () => {
      const { body, request } = await responseTo(host, "POST", "/events", 201, () => button(host, "Create Event").click());
      assert.deepEqual(request.postDataJSON(), { ...draft, timezone: "America/Los_Angeles" });
      assert.equal(body.timezone, "America/Los_Angeles");
      createdRoute = "/events/" + body.id;
      await heading(host, draft.title).waitFor();
      await words(toast(host), "Event created.").waitFor();
      assert.equal(new URL(host.url()).pathname, createdRoute);
      const back = button(host, "Back to Discover Events");
      await back.waitFor();
      const placement = await back.evaluate((node) => ({
        buttonTop: node.getBoundingClientRect().top,
        buttonBottom: node.getBoundingClientRect().bottom,
        toastTop: document.querySelector(".doin-toast").getBoundingClientRect().top,
        toastBottom: document.querySelector(".doin-toast").getBoundingClientRect().bottom,
      }));
      assert(placement.buttonTop >= placement.toastBottom || placement.buttonBottom <= placement.toastTop, JSON.stringify(placement));
      await clearance(button(host, "Cancel Event"));
      await host.evaluate(() => window.scrollTo(0, 0));
      await snapshot(host, "create-toast");
      await clearToast(host, "Event created.");
    });

    await check("Edit preserves image and capacity and selects a worldwide time zone", async () => {
      await eventForm(host, fixtureRoute + "/edit", true);
      await snapshot(host, "edit-top");
      measurements.edit = await measure(host);
      const capacity = field(host, "capacity");
      assert.equal(await capacity.inputValue(), String(draft.capacity));
      assert.equal(await host.locator("#event-image").getAttribute("type"), "file");
      await show(capacity);
      await snapshot(host, "edit-capacity");
      const zone = field(host, "timezone");
      await host.waitForFunction(() => !document.querySelector("#event-timezone").disabled);
      assert.equal(await zone.inputValue(), "New York, United States");
      assert.equal(await zone.getAttribute("role"), "combobox");
      await zone.fill("Not/AZone");
      await words(host, "No matching time zones. Try a city or country.").waitFor();
      await snapshot(host, "edit-invalid-zone");
      await zone.fill("Auckland");
      await zone.press("ArrowDown");
      await zone.press("Enter");
      const { body, request } = await responseTo(host, "PATCH", fixtureRoute, 200, () => button(host, "Save changes").click());
      assert.equal(body.timezone, "Pacific/Auckland");
      assert.equal(body.startTime, draft.startTime);
      assert.equal(body.endTime, draft.endTime);
      assert.equal(body.capacity, draft.capacity);
      assert.equal(body.imageUrl, fixture.imageUrl);
      assert.equal(request.postDataJSON().capacity, draft.capacity);
      assert.equal("imageUrl" in request.postDataJSON(), false);
      assert.equal(new URL(host.url()).pathname, fixtureRoute);
      await clearToast(host, "Event changes saved.");
      await visit(guest, fixtureRoute + "/edit", "Edit Event");
      await guest.getByRole("alert").filter({ hasText: "Only the event organizer" }).waitFor();
      assert.equal(await form(guest).count(), 0);
    });

    await check("incoming, outgoing, accepted, and empty connection states stay distinct", async () => {
      await visit(host, "/connections", "Connections");
      const request = personCard(host, "Noah Bennett");
      await button(request, "Accept").waitFor();
      const layout = measurements.connections = await measure(host);
      touch(layout.accept);
      touch(layout.decline);
      assert.equal(layout.accept.width, layout.decline.width);
      assert(layout.actionGap >= 8);
      assert.equal(await request.locator("img").getAttribute("data-avatar-fallback"), "");
      await snapshot(host, "connections-incoming");
      const connected = personCard(section(host, "Accepted connections"), "Jordan Lee");
      await link(connected, "View Jordan Lee's profile").waitFor();
      assert.equal(await connected.locator("button").count(), 0);
      await show(connected);
      await snapshot(host, "connections-accepted");
      const outgoing = personCard(section(host, "Outgoing requests"), "Sam Rivera");
      await button(outgoing, "Cancel request").waitFor();
      assert.equal(await personCard(section(host, "Suggested People"), "Sam Rivera").count(), 0);
      await show(outgoing);
      await snapshot(host, "connections-outgoing");
      await visit(empty.page, "/connections", "Connections");
      await words(empty.page, "No accepted connections yet.").waitFor();
      await words(empty.page, "No incoming requests.").waitFor();
      await words(empty.page, "No sent requests yet.").waitFor();
      await snapshot(empty.page, "connections-empty");
    });

    await check("failed connection mutation stays actionable and acceptance revalidates both sessions", async () => {
      await visit(guest, "/connections", "Connections");
      await words(guest, "No incoming requests.").waitFor();
      const route = "/connections/requests/" + incoming.id;
      const request = personCard(host, "Noah Bennett");
      const accept = button(request, "Accept");
      let release;
      let observe;
      const held = new Promise((resolve) => { release = resolve; });
      const seen = new Promise((resolve) => { observe = resolve; });
      let attempts = 0;
      const failure = async (intercepted) => {
        attempts += 1;
        observe();
        await held;
        await intercepted.fulfill({
          status: 503, json: { error: { code: "D4_TEST", message: "Could not accept this request. Try again." } },
        });
      };
      await host.route("**/api" + route, failure);
      try {
        await accept.click();
        await seen;
        assert.equal(await accept.isDisabled(), true);
        assert.equal(await accept.getAttribute("aria-busy"), "true");
        assert.equal(await button(request, "Decline").isDisabled(), true);
        await accept.evaluate((node) => node.click());
        assert.equal(attempts, 1);
      } finally {
        release();
      }
      await host.getByRole("alert").filter({ hasText: "Could not accept this request." }).waitFor();
      await host.unroute("**/api" + route, failure);
      await snapshot(host, "connections-action-error");
      const result = await responseTo(host, "PATCH", route, 200, () => accept.click());
      assert.equal(result.body.status, "accepted");
      await link(section(host, "Accepted connections"), "View Noah Bennett's profile").waitFor();
      await refresh(guest, "/users/" + sender.user.id + "/connections");
      await link(section(guest, "Accepted connections"), "View Maya Rivera's profile").waitFor();
    });

    await check("decline and cancellation keep their existing request transitions", async () => {
      const decline = await api(owner.context, "POST", "/connections/requests", 201, "user-chris", { recipientId: owner.user.id });
      await refresh(host, "/users/" + owner.user.id + "/connection-requests");
      const card = personCard(section(host, "Incoming requests"), "Chris Nguyen");
      const declined = await responseTo(host, "PATCH", "/connections/requests/" + decline.id, 200, () => button(card, "Decline").click());
      assert.equal(declined.body.status, "declined");
      await card.waitFor({ state: "detached" });
      const outgoing = personCard(section(host, "Outgoing requests"), "Sam Rivera");
      const canceled = await responseTo(host, "PATCH", "/connections/requests/" + sent.id, 200,
        () => button(outgoing, "Cancel request").click());
      assert.equal(canceled.body.status, "cancelled");
      await words(host, "No sent requests yet.").waitFor();
    });

    await check("keyboard Tab reveals a control that was behind the bottom bar", async () => {
      await eventForm(host, "/create-event");
      const start = host.locator("#event-image");
      await start.focus();
      const submit = button(host, "Create Event");
      const before = await submit.boundingBox();
      assert(before);
      await host.keyboard.press("Tab");
      await assertFocused(submit);
      await host.waitForFunction(() => document.activeElement.getBoundingClientRect().bottom <=
        document.querySelector(".navbar").getBoundingClientRect().top);
      assert.equal(await submit.evaluate((node) => getComputedStyle(node).outlineWidth), "2px");
      await snapshot(host, "navigation-keyboard");

      await visit(host, "/connections", "Connections");
      const lastSuggestion = section(host, "Suggested People").locator(".connection-user").last();
      await lastSuggestion.getByRole("link").focus();
      await host.keyboard.press("Tab");
      await assertFocused(button(lastSuggestion, "Connect"));
      await host.waitForFunction(() => document.activeElement.getBoundingClientRect().bottom <=
        document.querySelector(".navbar").getBoundingClientRect().top);
      await snapshot(host, "navigation-final-item");
    });

    const longName = "LongConnectionName".repeat(7);
    const longUsername = "longconnectionuser".repeat(6);
    await api(sender.context, "PATCH", "/users/" + sender.user.id, 200, sender.user.id, { name: longName, username: longUsername });
    const longRequest = await api(sender.context, "POST", "/connections/requests", 201, sender.user.id, { recipientId: empty.user.id });
    assert.equal(longRequest.status, "pending");
    measurements.widths = [];
    for (const width of [320, 375, 393, 430, 1280]) {
      await check("forms and connection cards fit at " + width + " CSS px", async () => {
        await host.setViewportSize({ width, height: viewport.height });
        await eventForm(host, "/create-event");
        await fillForm(host);
        await clearance(button(host, "Create Event"));
        const layout = await measure(host);
        assert.equal(layout.documentWidth, width);
        touch(layout.start);
        touch(layout.end);
        assert(layout.clearance >= 0);
        assert.equal(layout.start.y, layout.end.y);
        assert.equal(layout.start.width, layout.end.width);

        await empty.page.setViewportSize({ width, height: viewport.height });
        await visit(empty.page, "/connections", "Connections");
        const incomingCard = personCard(empty.page, longName);
        await fitsText(incomingCard.locator(".connection-name"), longName);
        await fitsText(incomingCard.locator(".connection-username"), "@" + longUsername);
        const connection = await measure(empty.page);
        assert.equal(connection.documentWidth, width);
        touch(connection.accept);
        touch(connection.decline);
        assert.equal(connection.accept.width, connection.decline.width);
        await clearance(button(incomingCard, "Decline"));
        measurements.widths.push({ width, form: layout, connection });
        if (width === viewport.width) await snapshot(empty.page, "connections-long-content");
      });
    }

    await check("emulated safe areas and narrow dialogs keep controls usable", async () => {
      await host.setViewportSize({ width: 320, height: 600 });
      const cdp = await owner.context.newCDPSession(host);
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 28, bottom: 24, left: 0, right: 0 } });
      try {
        await eventForm(host, "/create-event");
        assert.equal(await host.locator(".navbar").evaluate((node) => getComputedStyle(node).paddingBottom), "29px");
        assert.equal(await host.locator(".app-layout").evaluate((node) => getComputedStyle(node).paddingTop), "28px");
        await clearance(button(host, "Create Event"));
        await visit(host, createdRoute, draft.title);
        await button(host, "Cancel Event").click();
        const dialog = host.getByRole("dialog", { name: "Cancel this event?" });
        const box = await dialog.boundingBox();
        assert(box.x >= 0 && box.x + box.width <= 320 && box.y >= 28 && box.y + box.height <= 600 - 24);
        await assertFocused(button(dialog, "Keep event"));
        await host.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
      } finally {
        await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 0, bottom: 0, left: 0, right: 0 } });
        await cdp.detach();
        await host.setViewportSize(viewport);
      }
    });

    await check("final visual review covers onboarding and all signed-in page families", async () => {
      const { page } = await openSession(browser);
      async function record(name) {
        const layout = await measure(page);
        assert.equal(layout.documentWidth, viewport.width, name);
        review.push({ name, path: new URL(page.url()).pathname, documentHeight: layout.documentHeight });
        await snapshot(page, "review-" + name);
      }
      await visit(page, "/", "Meet people. Do things together.");
      await record("welcome");
      await visit(page, "/login", "Welcome back");
      await record("login");
      await visit(page, "/register", "Create an account");
      await record("registration");
      for (const [id, value] of Object.entries({
        fullName: "Jamie Perez", email: "jamie@example.test", password, confirmPassword: password,
      })) await page.locator("#" + id).fill(value);
      await page.locator("form button[type=submit]").click();
      await heading(page, "Your interests").waitFor();
      await button(page, "Art").click();
      await record("select-interests");
      await button(page, "Next").click();
      await heading(page, "Set up your profile").waitFor();
      await record("setup-profile");
      await page.keyboard.press("Tab");
      const photo = page.locator("#profile-photo");
      await assertFocused(photo);
      assert.equal(await page.locator('label[for="profile-photo"]').evaluate((node) => getComputedStyle(node).outlineWidth), "2px");
      await page.locator("#username").fill("jamieperez");
      await button(page, "Finish setup").click();
      await heading(page, "My Profile").waitFor();
      await clearToast(page, "Profile saved.");
      await record("my-profile");
      await visit(page, "/edit-profile", "Edit Profile");
      await page.locator("#username_field").waitFor();
      await record("edit-profile");
      await visit(page, "/discover", "Discover People");
      await words(page, "Alex Morgan").waitFor();
      await record("discover-people");
      await page.goto(origin + "/discover/user-alex");
      await words(page, "Alex Morgan").waitFor();
      await record("person-details");
      await visit(page, "/connections", "Connections");
      await words(page, "No accepted connections yet.").waitFor();
      await record("connections");
      await visit(page, "/events", "Discover Events");
      await heading(page, "Tennis Meetup").waitFor();
      await record("discover-events");
      await visit(page, "/events/event-1", "Tennis Meetup");
      await record("event-details");
      await visit(page, "/my-events", "My Events");
      await words(page, "You haven't joined any events yet.").waitFor();
      await record("my-events");
      await eventForm(page, "/create-event");
      await record("create-event");
      await eventForm(host, fixtureRoute + "/edit", true);
      review.push({ name: "edit-event", path: fixtureRoute + "/edit", documentHeight: (await measure(host)).documentHeight });
      await snapshot(host, "review-edit-event");
      await visit(page, "/missing-d4-review", "Page not found");
      await record("page-not-found");
      await visit(page, "/events", "Discover Events");
      await page.locator("#event-search").fill("unmatched-D4-fixture");
      await words(page, "No events match your search.").waitFor();
      await record("empty-events");
    });

    assert.deepEqual(errors, []);
    assert.deepEqual(httpFailures, [[503, "/api/events"], [503, "/api/connections/requests/" + incoming.id]]);
    await writeFile(path.join(output, "results.json"), JSON.stringify({ scenarios, measurements, review, errors, httpFailures }, null, 2));
    console.log(scenarios.length + " D4 browser scenarios passed. Evidence in " + output);
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
