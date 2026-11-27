const assert = require("node:assert/strict");
const { once } = require("node:events");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repo = path.resolve(process.env.DOIN_REPO_DIR ?? path.join(__dirname, "../.."));
const clientDirectory = path.resolve(process.env.DOIN_CLIENT_DIR ?? path.join(repo, "front-end/dist"));
const output = path.resolve(process.env.DOIN_BROWSER_OUTPUT_DIR ?? "/tmp/doin-d5-browser");
const viewport = { width: 393, height: 852 };
const photo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf7sAAAAASUVORK5CYII=", "base64");
const title = "Queens Printmaking Workshop";
let origin;

const button = (page, name) => page.getByRole("button", { name, exact: true });
const heading = (page, name) => page.getByRole("heading", { name, exact: true });
const text = (page, name) => page.getByText(name, { exact: true });
const toast = (page) => page.getByRole("region", { name: "Notification" });

async function api(context, method, route, status, id, data) {
  const response = await context.request.fetch(origin + "/api" + route, {
    method, data, headers: id ? { "Mock-User-Id": id } : undefined,
  });
  assert.equal(response.status(), status, (await response.body()).toString());
  return status === 204 ? null : response.json();
}

async function signup(context, name, username) {
  const actor = await api(context, "POST", "/auth/register", 201, null,
    { name, email: username + "@example.test", password: "DoinTest!234" });
  await api(context, "POST", "/profiles", 200, actor.id, { username });
  const page = await context.newPage();
  await page.addInitScript((id) => {
    if (!sessionStorage.getItem("doin.currentUserId")) sessionStorage.setItem("doin.currentUserId", id);
  }, actor.id);
  return { context, page, id: actor.id };
}

async function visit(page, route, title) {
  await page.goto(origin + route);
  await heading(page, title).waitFor();
}

async function reenter(page) {
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
}

async function action(page, method, route, status, perform) {
  const response = page.waitForResponse((item) =>
    new URL(item.url()).pathname === "/api" + route && item.request().method() === method);
  await perform();
  const result = await response;
  assert.equal(result.status(), status, await result.text());
  return status === 204 ? null : result.json();
}

async function selectZone(page, query, matchingName) {
  const zone = page.getByRole("combobox", { name: "Time zone" });
  await zone.fill(query);
  const option = page.getByRole("option", { name: matchingName });
  await option.waitFor();
  await option.click();
}

async function dismissToast(page, message) {
  await text(toast(page), message).waitFor();
  await button(toast(page), "Dismiss notification").click();
  await toast(page).waitFor({ state: "hidden" });
}

async function main() {
  await mkdir(output, { recursive: true });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const { createApp } = await import(pathToFileURL(path.join(repo, "back-end/src/app.js")));
  const server = createApp({ clientDirectory }).listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = "http://127.0.0.1:" + server.address().port;
  const scenarios = [];
  const errors = [];
  const layouts = [];
  let browser;
  try {
    browser = await chromium.launch();
    const options = { viewport, isMobile: true, hasTouch: true, locale: "en-US" };
    const hostContext = await browser.newContext({ ...options, timezoneId: "Pacific/Auckland" });
    const guestContext = await browser.newContext({ ...options, timezoneId: "America/Chicago" });
    for (const context of [hostContext, guestContext]) {
      await context.route("**/*", (route) => route.request().url().startsWith(origin)
        ? route.continue() : route.abort("blockedbyclient"));
      context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
    }
    const host = await signup(hostContext, "Maya Rivera", "d5maya");
    const guest = await signup(guestContext, "Robin Patel", "d5robin");
    const check = async (name, run) => { await run(); scenarios.push(name); console.log("PASS " + name); };
    let created;
    let eventRoute;

    await check("Create defaults to device zone and searches by city, timezone, France, Turkey, and Türkiye", async () => {
      await visit(host.page, "/create-event", "Create an Event");
      const zone = host.page.getByRole("combobox", { name: "Time zone" });
      await host.page.waitForFunction(() => document.querySelector('[name="timezone"]').value === "Pacific/Auckland");
      await zone.fill("France");
      await host.page.getByRole("option", { name: /Paris, France/ }).waitFor();
      await zone.fill("Turkey");
      await host.page.getByRole("option", { name: /Istanbul/ }).waitFor();
      await zone.fill("Türkiye");
      await host.page.getByRole("option", { name: /Istanbul/ }).waitFor();
      await zone.fill("zzqz");
      await text(host.page, "No matching time zones. Try a city or country.").waitFor();
      await zone.press("Escape");
      assert.equal(await zone.getAttribute("aria-expanded"), "false");
      await zone.fill("Europe/Paris");
      await zone.press("ArrowDown");
      assert.ok(await zone.getAttribute("aria-activedescendant"));
      await zone.press("Enter");
      assert.equal(await host.page.locator('[name="timezone"]').inputValue(), "Europe/Paris");
    });

    await check("Create persists the selected zone, local schedule, guest capacity, and file upload", async () => {
      const fields = {
        title, description: "Make a small print with other Doin members.", date: "2030-06-10",
        start: "13:00", end: "14:00", location: "Queens", capacity: "2",
      };
      for (const [field, value] of Object.entries(fields)) await host.page.locator("#event-" + field).fill(value);
      await host.page.locator("#event-category").selectOption("Art");
      await host.page.locator("#event-image").setInputFiles({ name: "event.png", buffer: photo, mimeType: "image/png" });
      await host.page.locator(".event-image-editor img").waitFor();
      created = await action(host.page, "POST", "/events", 201, () => button(host.page, "Create Event").click());
      eventRoute = "/events/" + created.id;
      assert.deepEqual([created.timezone, created.date, created.startTime, created.endTime, created.capacity],
        ["Europe/Paris", "2030-06-10", "13:00", "14:00", 2]);
      assert.match(created.imageUrl, /^data:image\/png;/);
      assert.equal((await api(guest.context, "GET", eventRoute, 200)).imageUrl, created.imageUrl);
      await text(host.page, "Hosted by you").waitFor();
      assert.equal(await button(host.page, "Join Event").count(), 0);
      await dismissToast(host.page, "Event created.");
    });

    await check("Guest joins with overlay coordinates stable before, during, and after the toast", async () => {
      await visit(guest.page, eventRoute, title);
      const positions = () => guest.page.evaluate(() =>
        [".event-details h1", ".event-info", ".navbar"].map((selector) => {
          const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
          return { x, y, width, height };
        }));
      await button(guest.page, "Join Event").click();
      const before = await positions();
      await action(guest.page, "POST", eventRoute + "/rsvp", 200,
        () => button(guest.page.getByRole("dialog"), "Confirm RSVP").click());
      await text(toast(guest.page), "RSVP confirmed.").waitFor();
      const during = await positions();
      const placement = await guest.page.evaluate(() => {
        const notification = document.querySelector(".doin-toast").getBoundingClientRect();
        const navbar = document.querySelector(".navbar").getBoundingClientRect();
        const back = document.querySelector(".event-details button").getBoundingClientRect();
        return notification.bottom <= navbar.top && (notification.top >= back.bottom || notification.bottom <= back.top);
      });
      assert(placement, "Toast should clear the navbar and Back control");
      await dismissToast(guest.page, "RSVP confirmed.");
      const after = await positions();
      assert.deepEqual(during, before);
      assert.deepEqual(after, before);
      layouts.push({ before, during, after });
      await api(host.context, "POST", eventRoute + "/rsvp", 403, host.id);
      await api(host.context, "DELETE", eventRoute + "/rsvp", 403, host.id);
    });

    await check("Both My Events tabs and organizer public profile return to the originating URL", async () => {
      await visit(guest.page, "/my-events", "My Events");
      await guest.page.getByRole("link", { name: title, exact: true }).click();
      await heading(guest.page, title).waitFor();
      assert.equal(new URL(guest.page.url()).search, "?from=joined");
      const organizer = guest.page.getByRole("link", { name: "Organized by Maya Rivera" });
      await organizer.locator("img").waitFor();
      await organizer.click();
      await heading(guest.page, "Profile").waitFor();
      await text(guest.page, "Hosted").waitFor();
      await button(guest.page, "Back to event").click();
      await heading(guest.page, title).waitFor();
      await button(guest.page, "Back to My Events").click();
      await heading(guest.page, "My Events").waitFor();
      assert.equal(new URL(guest.page.url()).search, "?tab=joined");
      await visit(host.page, "/my-events?tab=hosting", "My Events");
      await host.page.getByRole("link", { name: title, exact: true }).click();
      await heading(host.page, title).waitFor();
      await button(host.page, "Back to My Events").click();
      await host.page.getByRole("button", { name: /^Hosting/ }).waitFor();
      assert.equal(new URL(host.page.url()).search, "?tab=hosting");
      await visit(guest.page, eventRoute, title);
      await button(guest.page, "Back to events").click();
      await heading(guest.page, "Discover events").waitFor();
    });

    await check("Edit preserves the selected zone and supports new image, image removal, and capacity changes", async () => {
      await visit(host.page, eventRoute + "/edit", "Edit Event");
      const zone = host.page.getByRole("combobox", { name: "Time zone" });
      await host.page.waitForFunction(() => document.querySelector('[name="timezone"]').value === "Europe/Paris");
      assert.match(await zone.inputValue(), /Paris/);
      await selectZone(host.page, "Turkey", /Istanbul/);
      const capacity = host.page.locator("#event-capacity");
      assert.equal(await capacity.getAttribute("min"), "1");
      await capacity.fill("1");
      await button(host.page, "Remove image").click();
      const updated = await action(host.page, "PATCH", eventRoute, 200, () => button(host.page, "Save changes").click());
      assert.equal(updated.capacity, 1);
      assert.equal(updated.timezone, "Europe/Istanbul");
      assert.equal(updated.imageUrl, "/static/images/event-default.svg");
      await heading(host.page, title).waitFor();
      await dismissToast(host.page, "Event changes saved.");
      await visit(host.page, eventRoute + "/edit", "Edit Event");
      await host.page.locator("#event-image").setInputFiles({ name: "replacement.png", buffer: photo, mimeType: "image/png" });
      await host.page.locator(".event-image-editor img").waitFor();
      await host.page.locator("#event-capacity").fill("4");
      const replaced = await action(host.page, "PATCH", eventRoute, 200, () => button(host.page, "Save changes").click());
      assert.equal(replaced.capacity, 4);
      assert.equal(replaced.imageUrl, created.imageUrl);
      await api(guest.context, "PATCH", eventRoute, 403, guest.id, { capacity: 10 });
    });

    await check("Hosting card cancellation updates the second session and retains the canceled detail", async () => {
      await visit(guest.page, eventRoute, title);
      await visit(host.page, "/my-events?tab=hosting", "My Events");
      await button(host.page, "Cancel Event: " + title).click();
      const prompt = host.page.getByRole("dialog", { name: "Cancel this event?" });
      await button(prompt, "Keep event").waitFor();
      await action(host.page, "DELETE", eventRoute, 200, () => button(prompt, "Cancel Event").click());
      await dismissToast(host.page, "Event canceled.");
      await text(host.page, "You haven't created any events yet.").waitFor();
      await reenter(guest.page);
      await text(guest.page, "This event was canceled.").waitFor();
      assert.equal((await api(guest.context, "GET", eventRoute, 200)).status, "cancelled");
      assert.deepEqual(await api(guest.context, "GET", "/users/" + guest.id + "/events?type=joined", 200, guest.id), []);
    });

    assert.deepEqual(errors, []);
    await writeFile(path.join(output, "results.json"), JSON.stringify({ scenarios, errors, layouts }, null, 2));
    console.log(scenarios.length + " D5 browser scenarios passed.");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
