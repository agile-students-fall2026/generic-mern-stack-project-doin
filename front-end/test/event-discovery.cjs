const assert = require("node:assert/strict");
const { once } = require("node:events");
const { mkdir, mkdtemp, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const clientDirectory = path.resolve(process.env.DOIN_CLIENT_DIR ?? path.join(root, "front-end/dist"));
const baselineEvent = {
  title: "Coffee & Sketching",
  description: "Bring a sketchbook and spend an hour drawing over coffee. All experience levels are welcome. We’ll meet by the front entrance.",
  date: "2026-11-28",
  startTime: "10:30",
  endTime: "12:00",
  location: "Washington Square Park",
  category: "Art",
  capacity: 2,
};
const categories = ["Art", "Food", "Games", "Music", "Social", "Sports"];
const width = 393;
const height = 852;
const viewport = { width, height };
const cases = [];
const measurements = {};
let origin;
let output;

const heading = (page, name) => page.getByRole("heading", { name, exact: true });
const card = (page, title) => page.locator(".event-card").filter({ has: heading(page, title) });
const link = (page, name) => page.getByRole("link", { name, exact: true });
const toggle = (page) => page.locator(".event-filters summary");
const results = (page) => page.getByRole("region", { name: "Event results" });

async function check(name, run) {
  await run();
  cases.push(name);
  console.log("PASS " + name);
}

async function api(context, method, endpoint, expected, data, id) {
  const response = await context.request.fetch(origin + "/api" + endpoint, {
    method, data, headers: id ? { "Mock-User-Id": id } : {},
  });
  assert.equal(response.status(), expected, endpoint + " " + await response.text());
  return response.json();
}

async function signedInPage(context, name, username) {
  const email = username + "@example.test";
  const password = "DoinBrowser1!";
  const user = await api(context, "POST", "/auth/register", 201, { name, email, password });
  await api(context, "POST", "/profiles", 200, { username }, user.id);
  const page = await context.newPage();
  await page.goto(origin + "/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await heading(page, "Discover people").waitFor();
  return { user, page };
}

async function visitDiscovery(page) {
  await page.goto(origin + "/events");
  await heading(page, "Discover events").waitFor();
}

async function filterResponse(page, expected, action) {
  const [response] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      if (url.pathname !== "/api/events" || response.request().method() !== "GET") return false;
      const pairs = [...url.searchParams.entries()];
      return pairs.length === Object.keys(expected).length &&
        pairs.every(([key, value]) => expected[key] === value);
    }),
    action(),
  ]);
  assert.equal(response.status(), 200);
  return response.json();
}

async function capture(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: path.join(output, name + ".png"), scale: "css" });
}

async function measure(page) {
  return page.evaluate(() => {
    function box(selector) {
      const { width, height, top, bottom } = document.querySelector(selector).getBoundingClientRect();
      return { width, height, top, bottom };
    }
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      filter: box(".event-filters"),
      filterToggle: box(".event-filters summary"),
      search: box("#event-search"),
      create: box(".explore-create"),
      card: box(".event-card"),
      cardLink: box(".event-card-link"),
      navbar: box(".navbar"),
    };
  });
}

function assertTouchTarget(box) {
  assert(box.width >= 44 && box.height >= 44, JSON.stringify(box));
}

async function assertTextWraps(locator, expected) {
  assert.equal(await locator.textContent(), expected);
  const wrapping = await locator.evaluate((node) => {
    const outer = node.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(node);
    const lines = [...range.getClientRects()];
    return {
      lines: lines.length,
      fits: lines.every(({ left, right }) => left >= outer.left - 1 && right <= outer.right + 1),
    };
  });
  assert(wrapping.lines > 1 && wrapping.fits, "Expected unbroken text to wrap entirely within its box");
  return wrapping.lines;
}

async function main() {
  output = process.env.DOIN_BROWSER_OUTPUT_DIR ?? await mkdtemp(path.join(os.tmpdir(), "doin-event-discovery-"));
  await mkdir(output, { recursive: true });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const { createApp } = await import(pathToFileURL(path.join(root, "back-end/src/app.js")));
  const server = createApp({ clientDirectory }).listen(0, "127.0.0.1");
  const errors = [];
  const httpFailures = [];
  let browser;
  try {
    await once(server, "listening");
    origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({ headless: true });
    const options = { viewport, isMobile: true, hasTouch: true, locale: "en-US" };
    const hostContext = await browser.newContext({ ...options, timezoneId: "America/New_York" });
    const guestContext = await browser.newContext({ ...options, timezoneId: "America/Los_Angeles" });
    for (const context of [hostContext, guestContext]) {
      context.on("page", (page) => {
        page.setDefaultTimeout(6500);
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("response", (response) => {
          if (response.url().startsWith(origin) && response.status() >= 400) {
            httpFailures.push([response.status(), new URL(response.url()).pathname]);
          }
        });
      });
      await context.route("https://picsum.photos/**", (route) => route.abort());
    }
    const { user: host, page: organizer } = await signedInPage(hostContext, "Maya Rivera", "mayarivera");
    const { page: guest } = await signedInPage(guestContext, "Noah Bennett", "noahbennett");
    const sample = await api(hostContext, "POST", "/events", 201, baselineEvent, host.id);
    await api(hostContext, "POST", "/events/" + sample.id + "/rsvp", 200, undefined, "user-alex");

    await check("collapsed discovery shows a complete card with a single large native link", async () => {
      await visitDiscovery(guest);
      await heading(guest, "Tennis Meetup").waitFor();
      assert.equal(await card(guest, "Tennis Meetup").locator("a[href]").count(), 1);
      assert.equal(await card(guest, "Tennis Meetup").locator("button, input, select").count(), 0);
      assert.equal(await link(guest, "Tennis Meetup").getAttribute("href"), "/events/event-1");
      assert.equal(await guest.getByLabel("Category", { exact: true }).isVisible(), false);
      assert.equal(await guest.locator(".event-card").count(), 3);
      await card(guest, baselineEvent.title).getByText("1 of 2 attending", { exact: true }).waitFor();
      assert.match(await card(guest, baselineEvent.title).locator("time").textContent(), /^Sat, Nov 28/);
      assert.equal(await card(guest, baselineEvent.title).locator("time").getAttribute("datetime"), baselineEvent.date);
      await card(guest, "Tennis Meetup").getByText("3:00 PM – 5:00 PM ET", { exact: true }).waitFor();
      const layout = measurements.collapsed = await measure(guest);
      assert(layout.card.bottom <= layout.navbar.top);
      assert.equal(layout.documentWidth, width);
      for (const control of [layout.cardLink, layout.search, layout.create, layout.filterToggle]) assertTouchTarget(control);
      await capture(guest, "discover-collapsed");
    });

    await check("native disclosure supports keyboard focus, Enter, Space, and named inputs", async () => {
      const summary = toggle(guest);
      await guest.locator("#event-search").focus();
      await guest.keyboard.press("Tab");
      assert.equal(await summary.evaluate((node) => document.activeElement === node), true);
      assert.equal(await summary.evaluate((node) => getComputedStyle(node).outlineWidth), "2px");
      await guest.keyboard.press("Enter");
      const category = guest.getByLabel("Category", { exact: true });
      await category.waitFor();
      await guest.keyboard.press("Tab");
      assert.equal(await category.evaluate((node) => document.activeElement === node), true);
      assert.deepEqual((await category.locator("option").allTextContents()).slice(1), categories);
      assert.equal(await guest.getByLabel("Date", { exact: true }).getAttribute("type"), "date");
      measurements.expanded = await measure(guest);
      await capture(guest, "discover-expanded");
      await summary.focus();
      await guest.keyboard.press("Space");
      assert.equal(await category.isVisible(), false);
    });

    await check("search still matches titles, categories, and locations", async () => {
      const input = guest.getByRole("searchbox", { name: "Search events" });
      for (const [value, id] of [["board", "event-2"], ["sports", "event-1"], ["central park", "event-1"]]) {
        const found = await filterResponse(guest, { search: value }, () => input.fill(value));
        assert.deepEqual(found.map((event) => event.id), [id]);
      }
    });

    await check("category, location, and exact date combine and stay visible when collapsed", async () => {
      const query = { search: "Board" };
      await filterResponse(guest, query, () => guest.locator("#event-search").fill(query.search));
      await toggle(guest).click();
      for (const [key, value, selector, method] of [
        ["category", "Games", "#event-category-filter", "selectOption"],
        ["location", "Brooklyn", "#event-location-filter", "selectOption"],
        ["date", "2026-11-27", "#event-date-filter", "fill"],
      ]) {
        query[key] = value;
        const found = await filterResponse(guest, query, () => guest.locator(selector)[method](value));
        assert.deepEqual(found.map((event) => event.id), ["event-2"]);
      }
      await toggle(guest).click();
      assert.match(await toggle(guest).innerText(), /Filters \(3\)/);
      const chips = guest.getByRole("list", { name: "Active filters" });
      assert.match((await chips.getByRole("listitem").allTextContents()).join("|"), /^Games\|Brooklyn\|Fri, Nov 27/);
      await heading(guest, "Board Game Night").waitFor();
      await capture(guest, "discover-active-filters");
      const cleared = await filterResponse(guest, { search: "Board" }, () =>
        guest.getByRole("button", { name: "Clear filters", exact: true }).click());
      assert.deepEqual(cleared.map((event) => event.id), ["event-2"]);
      assert.equal(await guest.locator("#event-search").inputValue(), "Board");
      assert.equal(await chips.count(), 0);
      assert.equal(await toggle(guest).evaluate((node) => document.activeElement === node), true);
      assert.match(await toggle(guest).innerText(), /^Filters\s*$/);
      await toggle(guest).click();
      for (const selector of ["#event-category-filter", "#event-location-filter", "#event-date-filter"]) {
        assert.equal(await guest.locator(selector).inputValue(), "");
      }
    });

    await check("category alone, location alone, and a nonmatching date use independent query parameters", async () => {
      await visitDiscovery(guest);
      await toggle(guest).click();
      const sport = await filterResponse(guest, { category: "Sports" }, () =>
        guest.getByLabel("Category", { exact: true }).selectOption("Sports"));
      assert.deepEqual(sport.map((event) => event.id), ["event-1"]);
      await visitDiscovery(guest);
      await toggle(guest).click();
      const nearby = await filterResponse(guest, { location: "Brooklyn" }, () =>
        guest.getByLabel("Location", { exact: true }).selectOption("Brooklyn"));
      assert.deepEqual(nearby.map((event) => event.id), ["event-2"]);
      await visitDiscovery(guest);
      await toggle(guest).click();
      const absent = await filterResponse(guest, { date: "2026-11-29" }, () =>
        guest.getByLabel("Date", { exact: true }).fill("2026-11-29"));
      assert.deepEqual(absent, []);
      await results(guest).getByRole("status").filter({ hasText: "No events match your search." }).waitFor();
      assert.equal(await guest.locator(".event-card").count(), 0);
    });

    await check("category outage keeps results visible and can be retried while filters are collapsed", async () => {
      const pattern = "**/api/events/categories";
      const fail = (route) => route.fulfill({
        status: 503, json: { error: { code: "TEST", message: "Catalog unavailable." } },
      });
      await guest.route(pattern, fail);
      await visitDiscovery(guest);
      await guest.getByRole("alert").filter({ hasText: "Categories could not be loaded." }).waitFor();
      await heading(guest, "Tennis Meetup").waitFor();
      assert.equal(await guest.locator(".event-card").count(), 3);
      await capture(guest, "discover-category-outage");
      await guest.unroute(pattern, fail);
      const [response] = await Promise.all([
        guest.waitForResponse((response) => response.url().endsWith("/api/events/categories")),
        guest.getByRole("button", { name: "Retry categories", exact: true }).click(),
      ]);
      assert.deepEqual(await response.json(), categories);
      assert.equal(await toggle(guest).evaluate((node) => document.activeElement === node), true);
      await toggle(guest).click();
      const select = guest.getByLabel("Category", { exact: true });
      assert.equal(await select.isEnabled(), true);
      assert.deepEqual((await select.locator("option").allTextContents()).slice(1), categories);
    });

    await check("loading, result errors, retry, and empty searches are distinct", async () => {
      let release;
      const hold = new Promise((resolve) => { release = resolve; });
      const pattern = "**/api/events";
      const fail = async (route) => {
        await hold;
        await route.fulfill({ status: 503, json: { error: { code: "TEST", message: "Events unavailable." } } });
      };
      await guest.route(pattern, fail);
      try {
        await visitDiscovery(guest);
        await results(guest).getByRole("status").filter({ hasText: "Loading events…" }).waitFor();
        assert.equal(await guest.locator(".event-card").count(), 0);
        await capture(guest, "discover-loading");
      } finally {
        release();
      }
      await results(guest).getByRole("alert").filter({ hasText: "Events unavailable." }).waitFor();
      assert.equal(await results(guest).getByRole("status").count(), 0);
      await capture(guest, "discover-error");
      await guest.unroute(pattern, fail);
      await filterResponse(guest, {}, () => guest.getByRole("button", { name: "Retry events", exact: true }).click());
      assert.equal(await guest.locator("#event-search").evaluate((node) => document.activeElement === node), true);
      await heading(guest, "Tennis Meetup").waitFor();
      await filterResponse(guest, { search: "nothing-doin-d2" }, () =>
        guest.locator("#event-search").fill("nothing-doin-d2"));
      await results(guest).getByRole("status").filter({ hasText: "No events match your search." }).waitFor();
      await capture(guest, "discover-empty");
    });

    await check("native card link opens the existing Event Details route", async () => {
      await visitDiscovery(guest);
      const tennis = link(guest, "Tennis Meetup");
      await tennis.focus();
      assert.equal(await tennis.evaluate((node) => getComputedStyle(node).outlineWidth), "2px");
      await guest.keyboard.press("Enter");
      await heading(guest, "Tennis Meetup").waitFor();
      assert.equal(new URL(guest.url()).pathname, "/events/event-1");
      await guest.getByText("Organized by Alex Morgan", { exact: true }).waitFor();
      assert.equal(await guest.locator(".event-details-image").getAttribute("data-event-fallback"), "");
      await capture(guest, "event-banner-artwork");
    });

    await check("valid event artwork is preserved and a broken source uses the local fallback", async () => {
      const validImage = "/static/images/d2-existing.svg";
      const missingImage = "/static/images/d2-missing.svg";
      await guest.route("**" + validImage, (route) => route.fulfill({
        path: path.join(root, "front-end/public/doin-illustration.svg"),
        contentType: "image/svg+xml",
      }));
      const existing = await api(hostContext, "POST", "/events", 201, {
        ...baselineEvent, title: "Artwork check", imageUrl: validImage,
      }, host.id);
      const broken = await api(hostContext, "POST", "/events", 201, { ...baselineEvent, title: "Fallback check", imageUrl: missingImage }, host.id);
      await visitDiscovery(guest);
      const valid = card(guest, "Artwork check").locator("img");
      await valid.evaluate((img) => img.decode());
      assert.equal(await valid.getAttribute("src"), validImage);
      assert.equal(await valid.getAttribute("data-event-fallback"), null);
      const fallback = card(guest, "Fallback check").locator("img[data-event-fallback]");
      await fallback.waitFor();
      await fallback.evaluate((img) => img.decode());
      assert.equal(await fallback.getAttribute("src"), "/static/images/event-default.svg");
      const seedArtwork = card(guest, "Tennis Meetup").locator("img[data-event-fallback]");
      assert.equal(await seedArtwork.getAttribute("alt"), "");
      await link(guest, "Fallback check").click();
      await guest.locator(".event-details-image[data-event-fallback]").waitFor();
      assert.equal((await api(hostContext, "GET", "/events/" + broken.id, 200)).imageUrl, missingImage);
      await api(hostContext, "DELETE", "/events/" + existing.id, 200, undefined, host.id);
      await api(hostContext, "DELETE", "/events/" + broken.id, 200, undefined, host.id);
    });

    await check("foreground refresh keeps filtered results current across users", async () => {
      await visitDiscovery(guest);
      await filterResponse(guest, { search: "Freshness" }, () => guest.locator("#event-search").fill("Freshness"));
      await results(guest).getByRole("status").filter({ hasText: "No events match your search." }).waitFor();
      const own = await api(hostContext, "POST", "/events", 201, {
        ...baselineEvent, title: "Freshness check", startTime: "00:00", endTime: "12:00", location: "All",
      }, host.id);
      await filterResponse(guest, { search: "Freshness" }, () => guest.evaluate(() => window.dispatchEvent(new Event("focus"))));
      await card(guest, "Freshness check").getByText("12:00 AM – 12:00 PM ET", { exact: true }).waitFor();
      await toggle(guest).click();
      const all = await filterResponse(guest, { search: "Freshness", location: "All" }, () =>
        guest.getByLabel("Location", { exact: true }).selectOption("All"));
      assert.deepEqual(all.map((event) => event.id), [own.id]);
      await api(hostContext, "PATCH", "/events/" + own.id, 200, { title: "Freshness updated" }, host.id);
      await filterResponse(guest, { search: "Freshness", location: "All" }, () =>
        guest.evaluate(() => window.dispatchEvent(new Event("focus"))));
      await heading(guest, "Freshness updated").waitFor();
      await api(hostContext, "DELETE", "/events/" + own.id, 200, undefined, host.id);
      await filterResponse(guest, { search: "Freshness", location: "All" }, () =>
        guest.evaluate(() => window.dispatchEvent(new Event("focus"))));
      await results(guest).getByRole("status").filter({ hasText: "No events match your search." }).waitFor();
    });

    const longTitle = "WideEventTitle".repeat(9);
    const longLocation = "LongUnbrokenLocation".repeat(8);
    await api(hostContext, "POST", "/events", 201, {
      ...baselineEvent, title: longTitle, location: longLocation,
    }, host.id);
    measurements.screenWidths = [];
    for (const screenWidth of [320, 375, 393, 430, 1280]) {
      await check("complete first card, adequate targets, and untruncated long text at " + screenWidth + " px", async () => {
        await organizer.setViewportSize({ width: screenWidth, height });
        await visitDiscovery(organizer);
        await heading(organizer, "Tennis Meetup").waitFor();
        const layout = await measure(organizer);
        assert.equal(layout.documentWidth, screenWidth);
        assert(layout.card.bottom <= layout.navbar.top);
        for (const control of [layout.cardLink, layout.search, layout.create, layout.filterToggle]) assertTouchTarget(control);
        await filterResponse(organizer, { search: longTitle }, () => organizer.locator("#event-search").fill(longTitle));
        const long = card(organizer, longTitle);
        await long.waitFor();
        const titleLines = await assertTextWraps(long.locator("h2"), longTitle);
        const locationLines = await assertTextWraps(long.locator(".event-card-location span"), longLocation);
        measurements.screenWidths.push({ ...layout, titleLines, locationLines });
        await toggle(organizer).click();
        const locationFilter = organizer.getByLabel("Location", { exact: true });
        await locationFilter.locator("option").filter({ hasText: longLocation }).waitFor({ state: "attached" });
        await filterResponse(organizer, { search: longTitle, location: longLocation }, () =>
          locationFilter.selectOption(longLocation));
        await toggle(organizer).click();
        assert.equal(await organizer.evaluate(() => document.documentElement.scrollWidth), screenWidth);
        if (screenWidth === width) await capture(organizer, "discover-long-content");
      });
    }

    assert.deepEqual(errors, []);
    assert.deepEqual(httpFailures.filter(([status]) => status === 503),
      [[503, "/api/events/categories"], [503, "/api/events"]]);
    assert(httpFailures.some(([status, route]) => status === 404 && route === "/static/images/d2-missing.svg"));
    assert(httpFailures.every(([status, route]) => status === 503 || (status === 404 && route === "/static/images/d2-missing.svg")));
    await writeFile(path.join(output, "results.json"), JSON.stringify({ cases, measurements, errors, httpFailures }, null, 2));
    console.log(cases.length + " D2 browser scenarios passed. Evidence in " + output);
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
