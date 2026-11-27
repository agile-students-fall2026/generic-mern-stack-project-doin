const assert = require("node:assert/strict");
const { once } = require("node:events");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repo = path.resolve(process.env.DOIN_REPO_DIR ?? path.join(__dirname, "../.."));
const clientDirectory = process.env.DOIN_CLIENT_DIR ?? path.join(repo, "front-end/dist");
const output = process.env.DOIN_BROWSER_OUTPUT_DIR ?? "/tmp/doin-timezones-organizers-and-people-browser";
const schedule = { date: "2026-12-08", startTime: "09:15", endTime: "10:45" };
let origin;

const role = (page, type, name) => page.getByRole(type, { name, exact: true });
const button = (page, name) => role(page, "button", name);
const heading = (page, name) => role(page, "heading", name);
const results = (page) => role(page, "region", "People results");
const person = (scope, name) => role(scope, "link", `View ${name}'s profile`);
const zone = (page) => role(page, "combobox", "Time zone");
const zoneOptions = (page) => role(page, "listbox", "Time zones").getByRole("option");
const selectedZone = (page) => page.locator('input[name="timezone"]');
const activeNav = (page) => page.locator(".navbar [aria-current=page]");

async function api(request, method, url, status, userId, data) {
  const response = await request.fetch(origin + "/api" + url, {
    method, data, headers: userId ? { "Mock-User-Id": userId } : undefined,
  });
  assert.equal(response.status(), status, await response.text());
  return status === 204 ? null : response.json();
}

async function action(page, method, url, status, trigger) {
  const [response] = await Promise.all([
    page.waitForResponse((result) => new URL(result.url()).pathname === "/api" + url
      && result.request().method() === method),
    trigger(),
  ]);
  assert.equal(response.status(), status, await response.text());
  return response;
}

async function visit(page, route, title) {
  await page.goto(origin + route);
  await heading(page, title).waitFor();
}

async function search(page, value) {
  await page.getByRole("searchbox").fill(value);
  await results(page).getByRole("status").getByText("No people found.", { exact: true }).waitFor();
}

async function setUpPage(browser, errors, userId, timezoneId, zoneOverride) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, locale: "en-US", timezoneId,
  });
  await context.route("https://picsum.photos/**", (route) => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(6500);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(({ appOrigin, userId, zoneOverride }) => {
    if (location.origin !== appOrigin) return;
    sessionStorage.setItem("doin.currentUserId", userId);
    if (zoneOverride) {
      const resolve = Intl.DateTimeFormat.prototype.resolvedOptions;
      Intl.DateTimeFormat.prototype.resolvedOptions = function () {
        return { ...resolve.call(this), timeZone: zoneOverride };
      };
    }
  }, { appOrigin: origin, userId, zoneOverride });
  return page;
}

async function createDraft(page, title) {
  await visit(page, "/create-event", "Create an Event");
  for (const [field, value] of Object.entries({
    title, description: "Verify local time.", location: "Test studio", capacity: "8",
    date: schedule.date, start: schedule.startTime, end: schedule.endTime,
  })) {
    await page.locator("#event-" + field).fill(value);
  }
  await page.locator("#event-category").selectOption("Art");
}

function verifySchedule(event, timeZone) {
  assert.deepEqual([event.timezone, event.date, event.startTime, event.endTime],
    [timeZone, schedule.date, schedule.startTime, schedule.endTime]);
}

function foreground(page) {
  return page.evaluate(() => window.dispatchEvent(new Event("focus")));
}

async function main() {
  await mkdir(output, { recursive: true });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const { createApp } = await import(pathToFileURL(path.join(repo, "back-end/src/app.js")));
  const { store } = await import(pathToFileURL(path.join(repo, "back-end/src/data/store.js")));
  const server = createApp({ clientDirectory }).listen(0, "127.0.0.1");
  const errors = [];
  const scenarios = [];
  const screenshots = [];
  let browser;
  try {
    await once(server, "listening");
    origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch();
    const owner = await setUpPage(browser, errors, "user-alex", "Asia/Kathmandu");
    const peer = await setUpPage(browser, errors, "user-taylor", "America/New_York");

    async function check(label, verify) {
      await verify();
      scenarios.push(label);
      console.log("PASS " + label);
    }

    async function capture(page, name) {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
      });
      const { width, height } = page.viewportSize();
      const file = `${name}-${width}.png`;
      await page.screenshot({ path: path.join(output, file), scale: "css" });
      screenshots.push({ file, width, height, route: new URL(page.url()).pathname });
    }

    let geographicCount;
    await check("Create and Edit list all catalog geographical zones, including fractional offsets", async () => {
      const catalog = await api(owner.request, "GET", "/events/timezones", 200);
      const geographic = Object.entries(catalog.zones).filter(([, countries]) => countries.length > 0);
      geographicCount = geographic.length;
      assert.deepEqual([...new Set(geographic.map(([id]) => id.split("/")[0]))].sort(),
        ["Africa", "America", "Antarctica", "Asia", "Atlantic", "Australia", "Europe", "Indian", "Pacific"]);
      for (const [timeZone, expected] of [
        ["Asia/Kathmandu", "GMT+05:45"], ["Australia/Eucla", "GMT+08:45"],
        ["Pacific/Chatham", "GMT+13:45"], ["America/St_Johns", "GMT-03:30"],
      ]) {
        const formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" });
        const offset = formatter.formatToParts(new Date("2026-12-08T12:00:00Z"))
          .find((part) => part.type === "timeZoneName");
        assert.equal(offset.value, expected);
      }
      await visit(owner, "/create-event", "Create an Event");
      await owner.waitForFunction(() => document.querySelector('input[name="timezone"]').value === "Asia/Kathmandu");
      await zone(owner).click();
      const options = zoneOptions(owner);
      assert.equal(await options.count(), geographicCount);
      for (const term of ["GMT-8", "Etc/GMT+1", "UTC"]) {
        await zone(owner).fill(term);
        await owner.getByText("No matching time zones. Try a city or country.").waitFor();
        assert.equal(await options.count(), 0);
      }
      for (const [query, label] of [
        ["Kathmandu", /^Kathmandu, Nepal/],
        ["Australia/Eucla", /^Eucla, Australia/],
        ["Chatham", /^Chatham, New Zealand/],
        ["St_Johns", /^St Johns, Canada/],
        ["France", /^Paris, France/],
        ["Türkiye", /^Istanbul, Türkiye/],
        ["Turkey", /^Istanbul, Türkiye/],
      ]) {
        await zone(owner).fill(query);
        await owner.getByRole("option", { name: label }).waitFor();
      }
      await zone(owner).fill("Nepal");
      await zone(owner).press("ArrowDown");
      assert(await zone(owner).getAttribute("aria-activedescendant"));
      await capture(owner, "timezone-geographical");
      await owner.setViewportSize({ width: 320, height: 852 });
      await capture(owner, "timezone-geographical");
      await owner.setViewportSize({ width: 393, height: 852 });
      await zone(owner).press("Enter");
      assert.equal(await selectedZone(owner).inputValue(), "Asia/Kathmandu");
      await visit(owner, "/events/event-1/edit", "Edit Event");
      await zone(owner).click();
      assert.equal(await zoneOptions(owner).count(), geographicCount);
    });

    await check("UTC and fixed-offset devices keep their current zone without putting it in the list", async () => {
      for (const [deviceId, label] of [["UTC", "Device: UTC"], ["Etc/GMT-8", "Device: GMT+08:00"]]) {
        const page = await setUpPage(browser, errors, "user-alex", deviceId);
        try {
          const title = "Device zone " + deviceId;
          await createDraft(page, title);
          await page.waitForFunction((label) => document.querySelector("#event-timezone").value === label, label);
          await zone(page).click();
          assert.equal(await zoneOptions(page).count(), geographicCount);
          await zone(page).press("Escape");
          assert.equal(await zone(page).inputValue(), label);
          assert.equal(await selectedZone(page).inputValue(), deviceId);
          if (deviceId === "UTC") await capture(page, "timezone-device-utc");
          const created = await action(page, "POST", "/events", 201, () => button(page, "Create Event").click());
          verifySchedule(await created.json(), deviceId);
        } finally {
          await page.context().close();
        }
      }
    });

    await check("An unsupported device identifier prompts for an explicit geographical zone", async () => {
      const page = await setUpPage(browser, errors, "user-alex", "UTC", "+05:30");
      try {
        await createDraft(page, "Unsupported device zone");
        await button(page, "Create Event").click();
        await page.getByText("Choose an event time zone.", { exact: true }).waitFor();
        assert.equal(await selectedZone(page).inputValue(), "");
        assert.equal((await api(page.request, "GET", "/events?search=Unsupported+device+zone", 200)).length, 0);
        await zone(page).fill("Asia/Kolkata");
        await zone(page).press("ArrowDown");
        await zone(page).press("Enter");
        const response = await action(page, "POST", "/events", 201, () => button(page, "Create Event").click());
        verifySchedule(await response.json(), "Asia/Kolkata");
      } finally {
        await page.context().close();
      }
    });

    await check("Legacy time zones survive an unrelated edit and a deliberate replacement preserves wall-clock values", async () => {
      for (const [input, canonical] of [["GMT", "Etc/GMT"], ["UTC", "UTC"], ["Etc/GMT-8", "Etc/GMT-8"]]) {
        const title = "Legacy event " + input;
        const event = await api(owner.request, "POST", "/events", 201, "user-alex", {
          ...schedule, title, description: "Legacy fixture", location: "Test studio",
          category: "Art", capacity: 8, timezone: input,
        });
        verifySchedule(event, canonical);
        // Reproduce a record saved before the canonical catalog was introduced.
        if (input === "GMT") store.events.find((record) => record.id === event.id).timezone = input;
        const route = "/events/" + event.id;
        await visit(owner, route + "/edit", "Edit Event");
        await zone(owner).click();
        assert.equal(await zoneOptions(owner).count(), geographicCount);
        await zone(owner).press("Escape");
        assert.match(await zone(owner).inputValue(), /^Saved: /);
        assert.equal(await selectedZone(owner).inputValue(), input);
        if (input === "Etc/GMT-8") await capture(owner, "timezone-saved-offset");
        await owner.locator("#event-title").fill(title + " updated");
        const updated = await action(owner, "PATCH", route, 200, () => button(owner, "Save changes").click());
        assert.equal("timezone" in updated.request().postDataJSON(), false);
        verifySchedule(await updated.json(), input);
        verifySchedule(await api(owner.request, "GET", route, 200), input);

        await visit(owner, route + "/edit", "Edit Event");
        await zone(owner).fill("Australia/Eucla");
        await zone(owner).press("ArrowDown");
        await zone(owner).press("Enter");
        const replaced = await action(owner, "PATCH", route, 200, () => button(owner, "Save changes").click());
        verifySchedule(await replaced.json(), "Australia/Eucla");
      }
    });

    await check("The self-organizer entry is static and own public URLs redirect to My Profile", async () => {
      await visit(owner, "/events/event-1?from=hosting", "Tennis Meetup");
      const organizer = owner.locator(".event-organizer");
      await organizer.getByText("Organized by Alex Morgan").waitFor();
      assert.equal(await organizer.locator("img").count(), 1);
      assert.equal(await organizer.locator("a, button, [tabindex]").count(), 0);
      assert.equal(await organizer.getByText("Hosted by you").count(), 1);
      assert.equal(await organizer.locator(".event-organizer-identity").evaluate((node) =>
        getComputedStyle(node).textDecorationLine), "none");
      await organizer.getByText("Organized by Alex Morgan").click();
      assert.equal(new URL(owner.url()).pathname, "/events/event-1");
      await role(owner, "link", "Edit Event").waitFor();
      await capture(owner, "self-organizer");
      await owner.setViewportSize({ width: 320, height: 852 });
      await capture(owner, "self-organizer");
      await owner.setViewportSize({ width: 393, height: 852 });
      for (const url of ["/discover/user-alex", "/connections/user-alex", "/discover/user-alex?event=event-1&from=hosting"]) {
        await visit(owner, url, "My Profile");
        assert.equal(new URL(owner.url()).pathname, "/profile");
        assert.equal(await activeNav(owner).innerText(), "Profile");
      }
    });

    await check("Another organizer retains a keyboard-accessible profile link and event-context return", async () => {
      await api(owner.request, "POST", "/events/event-2/rsvp", 200, "user-alex");
      await visit(owner, "/events/event-2?from=joined", "Board Game Night");
      const organizer = role(owner, "link", "Organized by Jordan Lee");
      await organizer.focus();
      await organizer.press("Enter");
      await heading(owner, "Jordan Lee").waitFor();
      assert.equal(new URL(owner.url()).pathname, "/discover/user-jordan");
      assert.equal(await activeNav(owner).innerText(), "Events");
      await button(owner, "Send connection request").waitFor();
      await button(owner, "Back to Event Details").click();
      await organizer.waitFor();
      assert.equal(new URL(owner.url()).search, "?from=joined");
    });

    const toAlex = { recipientId: "user-alex" };
    const accepted = await api(owner.request, "POST", "/connections/requests", 201, "user-jordan", toAlex);
    await api(owner.request, "PATCH", "/connections/requests/" + accepted.id, 200, "user-alex", { status: "accepted" });
    const request = await api(owner.request, "POST", "/connections/requests", 201, "user-taylor", toAlex);
    await api(owner.request, "POST", "/connections/requests", 201, "user-alex", { recipientId: "user-priya" });

    await check("Discover excludes accepted connections in the list, search, and interest filters while retaining pending profiles", async () => {
      await visit(owner, "/discover", "Discover People");
      await person(results(owner), "Taylor Brooks").waitFor();
      await person(results(owner), "Priya Patel").waitFor();
      assert.equal(await person(results(owner), "Alex Morgan").count(), 0);
      assert.equal(await person(results(owner), "Jordan Lee").count(), 0);
      await capture(owner, "discover-eligible");
      await owner.setViewportSize({ width: 320, height: 852 });
      await capture(owner, "discover-eligible");
      await owner.setViewportSize({ width: 393, height: 852 });
      await search(owner, "Jordan Lee");
      await search(owner, "jordanlee");
      await owner.getByRole("searchbox").fill("");
      await owner.locator(".browse-filters summary").click();
      await role(owner, "checkbox", "Music").check();
      await person(results(owner), "Taylor Brooks").waitFor();
      assert.equal(await person(results(owner), "Jordan Lee").count(), 0);
      await capture(owner, "discover-music-filter");
      await person(results(owner), "Taylor Brooks").click();
      await button(owner, "Accept").waitFor();
      await button(owner, "Back to People").click();
      await person(results(owner), "Taylor Brooks").waitFor();
      assert.equal(await role(owner, "checkbox", "Music").isChecked(), true);
      await button(owner, "Clear filters").click();
      await person(results(owner), "Priya Patel").click();
      await button(owner, "Cancel request").waitFor();
      const stillListed = await api(owner.request, "GET", "/users?interest=Music", 200, "user-alex");
      assert(stillListed.some((record) => record.id === "user-jordan"));
      await visit(owner, "/discover/user-jordan", "Jordan Lee");
      await button(owner, "Disconnect").waitFor();
      await visit(owner, "/connections", "Connections");
      const suggestions = owner.locator(".connections-section").filter({ has: heading(owner, "Suggested People") });
      await person(suggestions, "Sam Rivera").waitFor();
      for (const name of ["Alex Morgan", "Jordan Lee", "Taylor Brooks", "Priya Patel"]) {
        assert.equal(await person(suggestions, name).count(), 0);
      }
    });

    await check("Discover suppresses results during relationship loading and errors and retries safely", async () => {
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      const pattern = "**/api/users/user-alex/connections";
      const fail = async (route) => {
        await gate;
        await route.fulfill({ status: 503, json: { error: { message: "Temporary connection read failure." } } });
      };
      await owner.route(pattern, fail);
      try {
        const directory = owner.waitForResponse((response) => new URL(response.url()).pathname === "/api/users");
        await visit(owner, "/discover", "Discover People");
        assert.equal((await directory).status(), 200);
        await results(owner).getByRole("status").getByText("Loading people...").waitFor();
        assert.equal(await results(owner).locator(".person-card").count(), 0);
      } finally {
        release();
      }
      await results(owner).getByRole("alert").filter({ hasText: "Could not check your connections." }).waitFor();
      assert.equal(await results(owner).locator(".person-card, .browse-message[role=status]").count(), 0);
      await capture(owner, "discover-relationship-retry");
      await owner.unroute(pattern, fail);
      await action(owner, "GET", "/users/user-alex/connections", 200, () => button(owner, "Retry connections").click());
      await person(results(owner), "Taylor Brooks").waitFor();
      assert.equal(await person(results(owner), "Jordan Lee").count(), 0);
    });

    await check("Accept and disconnect revalidate eligibility in both browser sessions", async () => {
      await visit(peer, "/discover", "Discover People");
      await peer.getByRole("searchbox").fill("alexmorgan");
      await person(results(peer), "Alex Morgan").waitFor();
      await visit(owner, "/connections", "Connections");
      const accept = owner.locator(".connection-request").filter({ has: person(owner, "Taylor Brooks") });
      await action(owner, "PATCH", "/connections/requests/" + request.id, 200, () => button(accept, "Accept").click());

      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      const pattern = "**/api/users/user-taylor/connections";
      const hold = async (route) => {
        await gate;
        await route.continue();
      };
      await peer.route(pattern, hold);
      try {
        await Promise.all([peer.waitForRequest(pattern), foreground(peer)]);
        await results(peer).getByRole("status").getByText("Loading people...").waitFor();
        assert.equal(await person(results(peer), "Alex Morgan").count(), 0);
      } finally {
        release();
      }
      await results(peer).getByText("No people found.", { exact: true }).waitFor();
      await peer.unroute(pattern, hold);
      await visit(owner, "/discover", "Discover People");
      await search(owner, "Taylor Brooks");
      await visit(peer, "/connections/user-alex", "Alex Morgan");
      await button(peer, "Disconnect").click();
      const dialog = peer.getByRole("dialog");
      await action(peer, "DELETE", "/users/user-taylor/connections/user-alex", 204,
        () => button(dialog, "Disconnect").click());
      await button(peer, "Send connection request").waitFor();
      await foreground(owner);
      await person(results(owner), "Taylor Brooks").waitFor();
      await visit(peer, "/discover", "Discover People");
      await person(results(peer), "Alex Morgan").waitFor();
    });

    assert.deepEqual(errors, []);
    await writeFile(path.join(output, "manifest.json"), JSON.stringify({
      browser: browser.version(), geographicCount, scenarios, screenshots, errors,
    }, null, 2));
    console.log(`${scenarios.length} timezone, organizer, and People discovery browser scenarios passed, ${screenshots.length} screenshots, zero uncaught page errors.`);
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
