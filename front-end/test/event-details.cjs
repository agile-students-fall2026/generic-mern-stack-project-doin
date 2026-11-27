const assert = require("node:assert/strict");
const { once } = require("node:events");
const { mkdir, mkdtemp, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const clientDirectory = path.resolve(process.env.DOIN_CLIENT_DIR ?? path.join(root, "front-end/dist"));
const viewport = { width: 393, height: 852 };
const fixture = {
  title: "Coffee & Sketching",
  description: "Bring a sketchbook and spend an hour drawing over coffee. All experience levels are welcome. We’ll meet by the front entrance.",
  date: "2026-11-28",
  startTime: "10:30",
  endTime: "12:00",
  location: "Washington Square Park",
  timezone: "America/New_York",
  category: "Art",
  capacity: 2,
};
const names = [
  ["Maya Rivera", "mayarivera"],
  ["Noah Bennett", "noahbennett"],
  ["Jordan Ellis", "jordanellis"],
];
const scenarios = [];
const measurements = {};
let origin;
let output;

const heading = (page, name) => page.getByRole("heading", { name, exact: true });
const button = (scope, name) => scope.getByRole("button", { name, exact: true });
const link = (scope, name) => scope.getByRole("link", { name, exact: true });
const words = (scope, text) => scope.getByText(text, { exact: true });
const dialog = (page, name) => page.getByRole("dialog", { name, exact: true });
const toast = (page) => page.getByRole("region", { name: "Notification" });
const myCard = (page, title) => page.locator(".my-event-card").filter({ has: heading(page, title) });

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

async function startSession(browser, index) {
  const [name, username] = names[index];
  const email = username + "@example.test";
  const password = "DoinBrowser1!";
  const context = await browser.newContext({
    viewport, isMobile: true, hasTouch: true, locale: "en-US",
    timezoneId: index === 0 ? "America/New_York" : "America/Los_Angeles",
  });
  await context.route("https://picsum.photos/**", (route) => route.abort());
  const user = await api(context, "POST", "/auth/register", 201, null, { name, email, password });
  await api(context, "POST", "/profiles", 200, user.id, { username, interests: ["Art"] });
  const page = await context.newPage();
  page.setDefaultTimeout(6500);
  await page.goto(origin + "/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await button(page, "Log in").click();
  await heading(page, "Discover People").waitFor();
  return { user, page, context };
}

async function visit(page, route, title = fixture.title, organizer = names[0][0]) {
  await page.goto(origin + route);
  await heading(page, title).waitFor();
  if (route.startsWith("/events/") && !route.endsWith("/edit")) {
    await words(page, "Organized by " + organizer).waitFor();
  }
}

async function responseTo(page, method, route, status, action) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => new URL(item.url()).pathname === "/api" + route &&
      item.request().method() === method),
    action(),
  ]);
  assert.equal(response.status(), status);
  return response.json();
}

function refresh(page, route) {
  return responseTo(page, "GET", route, 200, () => page.evaluate(() =>
    window.dispatchEvent(new Event("focus"))));
}

async function capture(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: path.join(output, name + ".png"), scale: "css" });
}

function measure(page) {
  return page.evaluate(() => {
    function box(selector) {
      const node = document.querySelector(selector);
      if (!node) return null;
      const { x, y, width, height, bottom, right } = node.getBoundingClientRect();
      return { x, y, width, height, bottom, right, documentY: y + scrollY };
    }
    const nav = box(".navbar");
    const primary = box(".rsvp-actions button");
    const edit = box(".event-management-actions a");
    const cancel = box(".event-management-actions button");
    return {
      viewport: [innerWidth, innerHeight],
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      details: box("main.event-details"),
      artwork: box(".event-details-image"),
      information: box(".event-info"),
      attendanceSummary: box(".attendee-summary"),
      attendanceSection: box(".attendee-summary") && box(".event-section:has(.attendee-summary)"),
      myCard: box(".my-event-card"),
      myEdit: box(".my-event-edit-link"),
      primary, edit, cancel, nav,
      primaryClearance: primary ? nav.y - primary.bottom : null,
      editCancelGap: edit && cancel ? Math.max(cancel.x - edit.right, cancel.y - edit.bottom) : null,
    };
  });
}

async function hasFocus(locator) {
  await locator.waitFor();
  await locator.page().waitForFunction((selector) => document.activeElement?.textContent.trim() === selector,
    (await locator.textContent()).trim());
  assert(await locator.evaluate((node) => node === document.activeElement));
}

function hasTouchTarget(box) {
  assert(box && box.width >= 44 && box.height >= 44, JSON.stringify(box));
}

async function wraps(locator, text) {
  assert.equal(await locator.textContent(), text);
  const result = await locator.evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(node);
    const lines = [...range.getClientRects()];
    return { lines: new Set(lines.map((line) => line.top)).size,
      within: lines.every(({ left, right }) => left >= bounds.left - 1 && right <= bounds.right + 1) };
  });
  assert(result.lines > 1 && result.within, JSON.stringify(result));
  return result.lines;
}

async function clearToast(page, message) {
  await words(toast(page), message).waitFor();
  await button(toast(page), "Dismiss notification").click();
  await toast(page).waitFor({ state: "hidden" });
}

async function main() {
  output = process.env.DOIN_BROWSER_OUTPUT_DIR ?? await mkdtemp(path.join(os.tmpdir(), "doin-event-details-"));
  await mkdir(output, { recursive: true });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const { createApp } = await import(pathToFileURL(path.join(root, "back-end/src/app.js")));
  const server = createApp({ clientDirectory }).listen(0, "127.0.0.1");
  const pageErrors = [];
  const failures = [];
  let browser;
  try {
    await once(server, "listening");
    origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch();
    const owner = await startSession(browser, 0);
    const guest = await startSession(browser, 1);
    const observer = await startSession(browser, 2);
    const host = owner.page;
    const attendee = guest.page;
    const spectator = observer.page;
    for (const page of [host, attendee, spectator]) {
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("response", (response) => {
        if (response.url().startsWith(origin) && response.status() >= 400) {
          failures.push([response.status(), new URL(response.url()).pathname]);
        }
      });
    }
    const event = await api(owner.context, "POST", "/events", 201, owner.user.id, fixture);
    const route = "/events/" + event.id;
    const rsvp = route + "/rsvp";

    await check("zero attendance, formatted schedule, and first-viewport RSVP", async () => {
      await visit(attendee, route);
      const info = attendee.locator(".event-info");
      await words(info, "Sat, Nov 28, 2026").waitFor();
      await words(info, "10:30 AM–12 PM").waitFor();
      await words(info, "Eastern Time").waitFor();
      assert.equal(await info.locator("time").getAttribute("datetime"), fixture.date);
      assert.equal(await info.locator("a, button").count(), 0);
      assert.equal(await link(attendee, "Edit Event").count(), 0);
      assert.equal(await button(attendee, "Cancel Event").count(), 0);
      await words(attendee, "0/2 attending").waitFor();
      await words(attendee, "2 guest spots left").waitFor();
      const layout = measurements.available = await measure(attendee);
      hasTouchTarget(layout.primary);
      assert(layout.primary.y >= 0 && layout.primaryClearance > 0);
      await capture(attendee, "details-available");
      const toggle = button(attendee, "Show Attendees");
      const panel = attendee.locator("[id=" + JSON.stringify(await toggle.getAttribute("aria-controls")) + "]");
      assert.equal(await panel.isVisible(), false);
      await toggle.click();
      await words(panel, "No attendees yet.").waitFor();
      assert.equal(await button(attendee, "Hide Attendees").getAttribute("aria-expanded"), "true");
      await button(attendee, "Hide Attendees").click();
    });

    await check("organizer actions are separate and cancellation starts on Keep event", async () => {
      await visit(host, route);
      await words(host, "Hosted by you").waitFor();
      assert.equal(await button(host, "Join Event").count(), 0);
      const edit = link(host, "Edit Event");
      assert.equal(await edit.getAttribute("href"), route + "/edit");
      const sizes = measurements.organizer = await measure(host);
      hasTouchTarget(sizes.edit);
      hasTouchTarget(sizes.cancel);
      assert(sizes.editCancelGap >= 8 && sizes.cancel.bottom <= sizes.nav.y);
      await capture(host, "details-organizer");
      const cancel = button(host, "Cancel Event");
      await cancel.focus();
      await host.keyboard.press("Enter");
      const prompt = dialog(host, "Cancel this event?");
      await hasFocus(button(prompt, "Keep event"));
      await capture(host, "dialog-cancel");
      await host.keyboard.press("Escape");
      await prompt.waitFor({ state: "hidden" });
      await hasFocus(cancel);
      assert.equal((await api(owner.context, "GET", route, 200)).status, "active");
    });

    await check("singular wording and expandable attendee list recover after a profile error", async () => {
      await api(owner.context, "POST", rsvp, 200, "user-alex");
      await refresh(attendee, route);
      await words(attendee, "1 guest spot left").waitFor();
      await words(attendee, "1/2 attending").waitFor();
      measurements.oneAttendee = await measure(attendee);
      await capture(attendee, "details-one-attendee");
      const failurePath = "**/api/users/user-alex";
      const rejectProfile = (request) => request.fulfill({
        status: 503, json: { error: { code: "ATTENDEE_TEMPORARILY_UNAVAILABLE", message: "Attendee unavailable." } },
      });
      await attendee.route(failurePath, rejectProfile);
      await button(attendee, "Show Attendees").click();
      const list = attendee.locator(".attendee-list");
      await words(list, "Some attendee profiles could not be loaded.").waitFor();
      await attendee.unroute(failurePath, rejectProfile);
      await responseTo(attendee, "GET", "/users/user-alex", 200, () => button(list, "Retry attendee profiles").click());
      await words(list, "Alex Morgan").waitFor();
      const avatar = list.locator(".attendee-image[data-avatar-fallback]");
      await avatar.evaluate((image) => image.decode());
      assert.equal(await list.getByRole("listitem").count(), 1);
      await capture(attendee, "attendees-expanded");
      await button(attendee, "Hide Attendees").click();
      await list.waitFor({ state: "hidden" });
    });

    await check("Join uses the existing confirmation, focus restoration, and toast", async () => {
      const join = button(attendee, "Join Event");
      await join.focus();
      await attendee.keyboard.press("Enter");
      const prompt = dialog(attendee, "Confirm RSVP");
      const confirm = button(prompt, "Confirm RSVP");
      await hasFocus(confirm);
      assert.match(await prompt.innerText(), /Sat, Nov 28/);
      assert.doesNotMatch(await prompt.innerText(), /2026-11-28/);
      await capture(attendee, "dialog-join");
      await attendee.keyboard.press("Escape");
      await prompt.waitFor({ state: "hidden" });
      await hasFocus(join);
      await join.click();
      const updated = await responseTo(attendee, "POST", rsvp, 200, () => confirm.click());
      assert.deepEqual(updated.attendeeIds, ["user-alex", guest.user.id]);
      await words(attendee, "2/2 attending").waitFor();
      await hasFocus(button(attendee, "Leave Event"));
      await clearToast(attendee, "RSVP confirmed.");
      measurements.joined = await measure(attendee);
      await capture(attendee, "details-joined");
    });

    await check("full event disables Join for nonattendees and enforces capacity in the API", async () => {
      await visit(spectator, route);
      await words(spectator, "0 guest spots left").waitFor();
      assert.equal(await button(spectator, "Event Full").isDisabled(), true);
      assert.equal(await button(spectator, "Leave Event").count(), 0);
      const response = await api(observer.context, "POST", rsvp, 409, observer.user.id);
      assert.equal(response.error.code, "EVENT_FULL");
      measurements.full = await measure(spectator);
      await capture(spectator, "details-full");
    });

    await check("My Events uses shared cards and sibling native edit links", async () => {
      await visit(attendee, "/my-events", "My Events");
      const joined = myCard(attendee, fixture.title);
      await joined.waitFor();
      assert.equal(await button(attendee, "Joined (1)").getAttribute("aria-pressed"), "true");
      assert.equal(await joined.locator("a").count(), 1);
      assert.equal(await joined.locator("a").getAttribute("href"), route + "?from=joined");
      assert.equal(await words(joined, "Attending").count(), 0);
      await words(joined, "10:30 AM–12 PM").waitFor();
      measurements.myJoined = await measure(attendee);
      await capture(attendee, "my-events-joined");
      await link(joined, fixture.title).click();
      await button(attendee, "Leave Event").waitFor();

      await visit(host, "/my-events", "My Events");
      await button(host, "Hosting (1)").click();
      const hosted = myCard(host, fixture.title);
      await hosted.waitFor();
      assert.equal(await button(host, "Hosting (1)").getAttribute("aria-pressed"), "true");
      assert.equal(await hosted.locator("a").count(), 2);
      assert.equal(await hosted.locator("a a, a button").count(), 0);
      assert.equal(await link(hosted, fixture.title).getAttribute("href"), route + "?from=hosting");
      const edit = link(hosted, "Edit Event: " + fixture.title);
      assert.equal(await edit.getAttribute("href"), route + "/edit?from=hosting");
      assert.equal(await words(hosted, "Hosting").count(), 0);
      const layout = measurements.myHosting = await measure(host);
      hasTouchTarget(layout.myEdit);
      assert(layout.myEdit.bottom <= layout.nav.y);
      await capture(host, "my-events-hosting");
      await edit.focus();
      await host.keyboard.press("Enter");
      await heading(host, "Edit Event").waitFor();
      assert.equal(new URL(host.url()).pathname, route + "/edit");
      assert.equal(await host.locator("#event-title").inputValue(), fixture.title);
    });

    await check("both empty My Events states give the correct guidance", async () => {
      await visit(spectator, "/my-events", "My Events");
      const emptyJoined = "You haven't joined any events yet.";
      await words(spectator, emptyJoined).waitFor();
      await capture(spectator, "my-events-empty-joined");
      await button(spectator, "Hosting (0)").click();
      await words(spectator, "You haven't created any events yet.").waitFor();
      assert.equal(await words(spectator, emptyJoined).count(), 0);
      await capture(spectator, "my-events-empty-hosting");
    });

    await check("Leave Event defaults to the safe action and removes Joined membership", async () => {
      await visit(attendee, route);
      await button(attendee, "Leave Event").focus();
      await attendee.keyboard.press("Enter");
      const prompt = dialog(attendee, "Leave Event?");
      await hasFocus(button(prompt, "Keep RSVP"));
      await capture(attendee, "dialog-leave");
      const result = await responseTo(attendee, "DELETE", rsvp, 200, () => button(prompt, "Confirm Leave").click());
      assert.deepEqual(result.attendeeIds, ["user-alex"]);
      await words(attendee, "1 guest spot left").waitFor();
      await hasFocus(button(attendee, "Join Event"));
      await clearToast(attendee, "You left the event.");
      await visit(attendee, "/my-events", "My Events");
      await words(attendee, "You haven't joined any events yet.").waitFor();
    });

    await check("a capacity conflict updates the open dialog and persists after dismissal", async () => {
      await visit(attendee, route);
      await button(attendee, "Join Event").click();
      const prompt = dialog(attendee, "Confirm RSVP");
      const confirm = button(prompt, "Confirm RSVP");
      await api(observer.context, "POST", rsvp, 200, observer.user.id);
      const rejected = await responseTo(attendee, "POST", rsvp, 409, () => confirm.click());
      assert.equal(rejected.error.code, "EVENT_FULL");
      await prompt.getByRole("alert").filter({ hasText: /full/i }).waitFor();
      await attendee.waitForFunction(() => document.querySelector(".rsvp-actions button")?.disabled);
      assert.equal(await confirm.isDisabled(), true);
      await attendee.keyboard.press("Escape");
      await prompt.waitFor({ state: "hidden" });
      await attendee.getByRole("alert").filter({ hasText: /full/i }).waitFor();
      assert.equal(await button(attendee, "Event Full").isDisabled(), true);

      await api(observer.context, "DELETE", rsvp, 200, observer.user.id);
      await refresh(attendee, route);
      await button(attendee, "Join Event").click();
      assert.equal(await prompt.getByRole("alert").count(), 0);
      await responseTo(attendee, "POST", rsvp, 200, () => confirm.click());
      await clearToast(attendee, "RSVP confirmed.");
    });

    await check("cancellation refreshes Joined and makes an open RSVP dialog unavailable", async () => {
      await api(owner.context, "DELETE", rsvp, 200, "user-alex");
      await visit(attendee, "/my-events", "My Events");
      await myCard(attendee, fixture.title).waitFor();
      await visit(spectator, route);
      await button(spectator, "Join Event").click();
      const stale = dialog(spectator, "Confirm RSVP");
      await visit(host, route);
      await button(host, "Cancel Event").click();
      const confirmation = dialog(host, "Cancel this event?");
      const result = await responseTo(host, "DELETE", route, 200, () => button(confirmation, "Cancel Event").click());
      assert.equal(result.status, "cancelled");
      await heading(host, "Discover Events").waitFor();
      await clearToast(host, "Event canceled.");
      await refresh(attendee, "/users/" + guest.user.id + "/events");
      await words(attendee, "You haven't joined any events yet.").waitFor();

      await refresh(spectator, route);
      await words(stale.getByRole("alert"), "This event was canceled.").waitFor();
      assert.equal(await button(stale, "Confirm RSVP").isDisabled(), true);
      await spectator.keyboard.press("Escape");
      await stale.waitFor({ state: "hidden" });
      await spectator.getByRole("status").filter({ hasText: "This event was canceled." }).waitFor();
      await hasFocus(heading(spectator, fixture.title));
      assert.equal(await spectator.locator(".rsvp-actions, .event-management-actions").count(), 0);
      await words(spectator, "RSVP closed").waitFor();
      await capture(spectator, "details-canceled");
      await visit(host, route + "/edit", "Edit Event");
      await words(host, "Canceled events cannot be edited.").waitFor();
    });

    const longDescription = "Bring a sketchbook and take your time. ".repeat(30).trim();
    const tall = await api(owner.context, "POST", "/events", 201, owner.user.id, {
      ...fixture, title: "Long description event", description: longDescription,
    });
    await check("a long description keeps RSVP ahead of the text and clear of navigation", async () => {
      await visit(attendee, "/events/" + tall.id, tall.title);
      const layout = measurements.longDescription = await measure(attendee);
      assert(layout.documentHeight > viewport.height && layout.primaryClearance > 0);
      assert.equal(await attendee.locator(".event-description").textContent(), longDescription);
      await capture(attendee, "details-long-description");
    });

    const long = await api(owner.context, "POST", "/events", 201, owner.user.id, {
      ...fixture,
      title: "LongEventTitle".repeat(10),
      location: "LongEventLocation".repeat(9),
      description: "LongEventDescription".repeat(15),
    });
    measurements.widths = [];
    for (const width of [320, 375, 393, 430, 1280]) {
      await check("long event details and Hosting cards fit at " + width + " CSS px", async () => {
        await host.setViewportSize({ width, height: viewport.height });
        await visit(host, "/events/" + long.id, long.title);
        const sizes = await measure(host);
        assert.equal(sizes.documentWidth, width);
        for (const size of [sizes.edit, sizes.cancel]) hasTouchTarget(size);
        const titleLines = await wraps(heading(host, long.title), long.title);
        const descriptionLines = await wraps(host.locator(".event-description"), long.description);
        const locationLines = await wraps(host.locator(".event-info .event-location"), long.location);
        await visit(host, "/my-events", "My Events");
        await host.getByRole("button", { name: /^Hosting/ }).click();
        const card = myCard(host, long.title);
        await card.waitFor();
        await wraps(card.locator("h2"), long.title);
        await wraps(card.locator(".event-card-location span"), long.location);
        const edit = link(card, "Edit Event: " + long.title);
        assert.equal(await edit.getAttribute("href"), "/events/" + long.id + "/edit?from=hosting");
        const editBounds = await edit.boundingBox();
        hasTouchTarget(editBounds);
        assert.equal(await host.evaluate(() => document.documentElement.scrollWidth), width);
        measurements.widths.push({ width, titleLines, locationLines, descriptionLines, primary: sizes.primary });
        if (width === viewport.width) await capture(host, "my-events-long-content");
      });
    }

    assert.deepEqual(pageErrors, []);
    assert.deepEqual(failures, [[503, "/api/users/user-alex"], [409, "/api" + rsvp]]);
    await writeFile(path.join(output, "results.json"), JSON.stringify({ scenarios, measurements, pageErrors, failures }, null, 2));
    console.log(scenarios.length + " event detail browser scenarios passed. Evidence in " + output);
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
