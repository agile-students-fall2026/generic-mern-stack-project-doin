const assert = require("node:assert/strict");
const { once } = require("node:events");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const repo = path.resolve(process.env.DOIN_REPO_DIR ?? path.join(__dirname, "../.."));
const clientDirectory = process.env.DOIN_CLIENT_DIR ?? path.join(repo, "front-end/dist");
const output = process.env.DOIN_BROWSER_OUTPUT_DIR ?? "/tmp/doin-responsive-workflows-browser";
const widths = [320, 375, 393, 430, 1280];
const title = "Weekend board games and a beginner-friendly introduction for neighbors who have never played";
const longName = "Taylor Marie Brooks-Rivera";
let origin;

const role = (page, name, label) => page.getByRole(name, { name: label, exact: true });
const heading = (page, name) => role(page, "heading", name);
const button = (page, name) => role(page, "button", name);
const link = (page, name) => role(page, "link", name);
const marker = (page) => page.locator(".navbar [aria-current=page]");
const section = (page, name) => page.locator(".connections-section").filter({ has: heading(page, name) });
const filters = (page) => page.locator(".browse-filters summary");
const userLink = (page, name) => link(page, `View ${name}'s profile`);

async function api(request, method, route, status, id, data) {
  const response = await request.fetch(origin + "/api" + route, {
    method, data, headers: id ? { "Mock-User-Id": id } : undefined,
  });
  assert.equal(response.status(), status, await response.text());
  return status !== 204 && response.json();
}

async function visit(page, route, name) {
  await page.goto(origin + route);
  await heading(page, name).waitFor();
}

async function expectNav(page, name) {
  assert.equal(await marker(page).count(), 1);
  assert.equal(await marker(page).innerText(), name);
  assert.equal(await marker(page).locator("svg").count(), 1);
}

async function assertFits(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), page.viewportSize().width);
}

async function capture(page, name, manifests, lower = false) {
  const { width, height } = page.viewportSize();
  if (width !== 320 && width !== 393) return;
  await page.evaluate(async (lower) => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    window.scrollTo(0, lower ? document.documentElement.scrollHeight : 0);
    await new Promise(requestAnimationFrame);
  }, lower);
  const file = name + (width === 320 ? "-320" : "") + ".png";
  await page.screenshot({ path: path.join(output, file), scale: "css" });
  const geometry = await page.evaluate(() => {
    const bounds = (el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { x, y, width, height };
    };
    return Object.fromEntries([
      "h1", ".navbar", ".browse-filters", ".event-card", ".person-card", ".event-info",
      ".rsvp-actions button", ".doin-form-card", ".create-event-times", ".connections-section",
      ".user-profile-stats", ".user-profile-actions",
    ].flatMap((selector) => [...document.querySelectorAll(selector)].slice(0, 3)
      .map((el, index) => [index ? selector + " " + index : selector, bounds(el)])));
  });
  manifests.push({ file, width, height, route: new URL(page.url()).pathname, geometry });
}

async function fixtures(request) {
  const duration = { date: "2026-11-28", startTime: "15:00", endTime: "17:00", capacity: 8 };
  const shared = {
    ...duration, description: "Bring a game you love or join a table and learn the rules together.",
    category: "Games", timezone: "Australia/Darwin",
  };
  const register = async (name, username, profile) => {
    const user = await api(request, "POST", "/auth/register", 201, null,
      { name, email: username + "@example.test", password: "DoinTest!234" });
    await api(request, "POST", "/profiles", 200, user.id, { username, ...profile });
    return user.id;
  };
  const taylor = await register(longName, "taylormariebrooksrivera", {
    bio: "I organize board-game afternoons and look for new trails on weekends.",
    location: "Queens, NY", interests: ["Hiking", "Music", "Games"],
  });
  const maya = await register("Maya Rivera", "mayarivera", {
    bio: "I make prints and love sharing a studio table with beginners.",
    location: "Queens, NY", interests: ["Art", "Coffee"],
  });
  const print = await api(request, "POST", "/events", 201, maya, {
    title: "Queens Printmaking Workshop", description: "Make a small print with other Doin members.",
    date: "2026-12-05", startTime: "13:00", endTime: "14:00", timezone: "America/New_York",
    location: "Queens", category: "Art", capacity: 4,
  });
  await api(request, "POST", "/events", 201, "user-sam", {
    title: "Weekend Coffee Meetup", description: "Meet for coffee, then take a walk around the neighborhood.",
    date: "2026-11-29", startTime: "10:00", endTime: "11:30", timezone: "America/New_York",
    location: "West Village", category: "Social", capacity: 6,
  });
  const long = await api(request, "POST", "/events", 201, "user-taylor", {
    ...shared, title, location: "Nightcliff Community Centre, Casuarina Drive, Nightcliff, Northern Territory",
  });
  for (const [event, guests] of [["event-2", ["user-sam", taylor]],
    [print.id, ["user-alex", "user-chris"]],
    [long.id, ["user-sam", taylor, "user-jordan", "user-priya"]]]) {
    for (const guest of guests) await api(request, "POST", `/events/${event}/rsvp`, 200, guest);
  }
  await api(request, "POST", "/connections/requests", 201, taylor, { recipientId: "user-alex" });
  await api(request, "POST", "/connections/requests", 201, "user-alex", { recipientId: "user-priya" });
  const accepted = await api(request, "POST", "/connections/requests", 201, "user-jordan", { recipientId: "user-alex" });
  await api(request, "PATCH", `/connections/requests/${accepted.id}`, 200, "user-alex", { status: "accepted" });
  return { print, long };
}

async function main() {
  await mkdir(output, { recursive: true });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const { createApp } = await import(pathToFileURL(path.join(repo, "back-end/src/app.js")));
  const server = createApp({ clientDirectory }).listen(0, "127.0.0.1");
  const errors = [];
  const scenarios = [];
  const screenshots = [];
  const phoneLayouts = [];
  let browser;
  try {
    await once(server, "listening");
    origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true,
      locale: "en-US", timezoneId: "America/New_York",
    });
    await context.route("https://picsum.photos/**", (route) => route.abort());
    context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
    await context.addInitScript((appOrigin) => {
      if (location.origin !== appOrigin) return;
      if (!sessionStorage.getItem("doin.test.responsive-session-initialized")) {
        sessionStorage.setItem("doin.currentUserId", "user-alex");
        sessionStorage.setItem("doin.test.responsive-session-initialized", "true");
      }
    }, origin);
    const page = await context.newPage();
    page.setDefaultTimeout(6500);
    const { print, long } = await fixtures(context.request);

    async function check(name, work) {
      await work();
      scenarios.push(name);
      console.log("PASS " + name);
    }

    const screenshot = (name, lower) => capture(page, name, screenshots, lower);
    for (const width of widths) {
      await check(`long Event Details metadata and first-viewport RSVP at ${width} CSS px`, async () => {
        await page.setViewportSize({ width, height: 852 });
        await visit(page, "/events/" + long.id, title);
        const metadata = page.locator(".event-info");
        assert.deepEqual(await metadata.locator("dt").allTextContents(), ["Date", "Location", "Time", "Time zone"]);
        assert.deepEqual(await metadata.locator("dd").evaluateAll((nodes) =>
          nodes.map((node) => getComputedStyle(node).fontSize)), ["15px", "15px", "15px", "15px"]);
        const grid = await metadata.locator("div").evaluateAll((nodes) => nodes.map((node) => ({
          top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left,
        })));
        assert.equal(grid[0].top, grid[1].top);
        assert.equal(grid[2].top, grid[3].top);
        assert(grid[0].left < grid[1].left && grid[0].top < grid[2].top);
        const join = await button(page, "Join Event").boundingBox();
        const nav = await page.locator(".navbar").boundingBox();
        assert(join.height >= 44 && join.y >= 0 && join.y + join.height < nav.y);
        await expectNav(page, "Events");
        await assertFits(page);
        phoneLayouts.push({ width, join, nav, grid });
        await screenshot("details-long");
      });
    }

    for (const width of [320, 393]) {
      await page.setViewportSize({ width, height: 852 });
      await check(`self-hosted event is Discover-only exclusion at ${width}px`, async () => {
        await visit(page, "/events", "Discover Events");
        const results = page.getByRole("region", { name: "Event results" });
        await link(results, "Board Game Night").waitFor();
        assert.equal(await link(results, "Tennis Meetup").count(), 0);
        await role(results, "heading", print.title).waitFor();
        assert.equal(await link(results, print.title).getByText("Joined").count(), 1);
        const listed = await api(context.request, "GET", "/events", 200, "user-alex");
        assert(listed.some((event) => event.id === "event-1"));
        await expectNav(page, "Events");
        await screenshot("events");
        await page.locator("#event-search").fill("Tennis");
        await page.getByText("No events match your search.").waitFor();
        await visit(page, "/my-events?tab=hosting", "My Events");
        await link(page, "Tennis Meetup").waitFor();
        await screenshot("hosting");
        await link(page, "Tennis Meetup").click();
        await heading(page, "Tennis Meetup").waitFor();
        assert.equal(await button(page, "Join Event").count(), 0);
        await assertFits(page);
        await screenshot("details-host");
        await button(page, "Back to Hosting").click();
        await link(page, "Tennis Meetup").waitFor();
        assert.equal(new URL(page.url()).search, "?tab=hosting");
      });

      await check(`Discover filters, disclosure, scroll and focus survive both Back paths at ${width}px`, async () => {
        await visit(page, "/events", "Discover Events");
        await link(page, "Board Game Night").waitFor();
        await filters(page).click();
        await role(page, "radio", "Games").waitFor();
        await screenshot("events-filters");
        await role(page, "radio", "Games").check();
        await role(page, "radio", "Art").check();
        assert.equal(await role(page, "radio", "Games").isChecked(), false);
        await role(page, "radio", "Games").check();
        await page.locator("#event-search").fill("board");
        const target = link(page, long.title);
        await target.waitFor();
        await target.scrollIntoViewIfNeeded();
        const scrollTop = await page.evaluate(() => window.scrollY);
        assert(scrollTop > 0, "The fixture must scroll for a meaningful restoration check");
        await target.click();
        await heading(page, long.title).waitFor();
        await button(page, "Back to Discover Events").click();
        await target.waitFor();
        assert.equal(await page.locator("#event-search").inputValue(), "board");
        assert.equal(await role(page, "radio", "Games").isChecked(), true);
        assert.equal(await page.locator(".browse-filters").getAttribute("open"), "");
        await page.waitForFunction((top) => Math.abs(window.scrollY - top) <= 2, scrollTop);
        assert(await target.evaluate((element) => document.activeElement === element));
        await target.click();
        await heading(page, long.title).waitFor();
        await page.goBack();
        await target.waitFor();
        assert.equal(await role(page, "radio", "Games").isChecked(), true);
        await button(page, "Clear filters").click();
        assert.equal(await page.locator("#event-search").inputValue(), "board");
        assert.equal(await role(page, "radio", "All categories").isChecked(), true);
        await assertFits(page);
      });

      await check(`attendee public profiles and own static row at ${width}px`, async () => {
        await visit(page, "/events/event-2", "Board Game Night");
        await button(page, "Join Event").waitFor();
        await screenshot("details-attendee");
        await button(page, "Show Attendees").click();
        const attendee = userLink(page, longName);
        await attendee.waitFor();
        assert.equal(await attendee.locator("img").count(), 1);
        await screenshot("details-guests");
        await attendee.click();
        await heading(page, longName).waitFor();
        await expectNav(page, "Events");
        await button(page, "Accept").waitFor();
        await button(page, "Back to Event Details").click();
        await attendee.waitFor();
        await userLink(page, "Sam Rivera").click();
        await heading(page, "Sam Rivera").waitFor();
        await button(page, "Send connection request").waitFor();
        await screenshot("profile-attendee");
        await button(page, "Back to Event Details").click();
        await attendee.waitFor();
        assert.equal(await button(page, "Hide Attendees").getAttribute("aria-expanded"), "true");
        await visit(page, "/my-events?tab=joined", "My Events");
        await link(page, print.title).waitFor();
        await screenshot("joined");
        await link(page, print.title).click();
        await button(page, "Show Attendees").click();
        const own = page.locator(".attendee-self");
        await own.getByText("You", { exact: true }).waitFor();
        assert.equal(await own.getByText("Alex Morgan", { exact: true }).count(), 1);
        assert.equal(await own.locator("a, button, svg").count(), 0);
        assert.equal(await own.locator("img").count(), 1);
        assert.equal(await userLink(page, "Alex Morgan").count(), 0);
        await userLink(page, "Chris Nguyen").waitFor();
        await button(page, "Back to Joined").click();
        await heading(page, "My Events").waitFor();
        assert.equal(new URL(page.url()).search, "?tab=joined");
        await visit(page, "/events", "Discover Events");
        await link(page, print.title).click();
        await button(page, "Show Attendees").click();
        await page.locator(".attendee-self").waitFor();
        await screenshot("details-joined");
      });

      await check(`People and Connections retain context, filters, and correct profile identities at ${width}px`, async () => {
        await visit(page, "/discover", "Discover People");
        await userLink(page, longName).waitFor();
        await screenshot("people");
        await filters(page).click();
        await role(page, "checkbox", "Hiking").check();
        await role(page, "checkbox", "Games").check();
        await userLink(page, longName).waitFor();
        await screenshot("people-filters");
        await userLink(page, longName).click();
        await heading(page, longName).waitFor();
        await expectNav(page, "People");
        await button(page, "Back to People").click();
        await userLink(page, longName).waitFor();
        assert.equal(await role(page, "checkbox", "Hiking").isChecked(), true);
        assert.equal(await role(page, "checkbox", "Games").isChecked(), true);
        await visit(page, "/connections", "Connections");
        for (const [label, user, screenshotName] of [
          ["Incoming requests", longName, "profile-incoming"],
          ["Outgoing requests", "Priya Patel", "profile-outgoing"],
          ["Accepted connections", "Jordan Lee", "profile-connected"],
        ]) {
          await userLink(section(page, label), user).click();
          await heading(page, user).waitFor();
          await expectNav(page, "Connect");
          await screenshot(screenshotName);
          await button(page, "Back to Connections").click();
          await heading(page, "Connections").waitFor();
        }
        const suggested = section(page, "Suggested People");
        await link(suggested, "Discover more people").waitFor();
        const links = await suggested.locator(".connection-profile-link").allTextContents();
        assert.equal(links.length, 3);
        for (const user of [longName, "Priya Patel", "Jordan Lee", "Alex Morgan"]) {
          assert.equal(await userLink(suggested, user).count(), 0);
        }
        await assertFits(page);
        await screenshot("connections");
        await screenshot("connections-lower", true);
      });

      await check(`Create and Edit use native controls and live duration at ${width}px`, async () => {
        await visit(page, "/create-event", "Create an Event");
        await page.locator("#event-category").waitFor();
        assert.equal(await page.locator(".doin-form-card fieldset legend").count(), 3);
        assert.equal(await page.locator("#event-date").getAttribute("type"), "date");
        assert.equal(await page.locator("#event-start").getAttribute("type"), "time");
        assert.equal(await page.locator("#event-end").getAttribute("type"), "time");
        await assertFits(page);
        await screenshot("create");
        await screenshot("create-lower", true);
        await page.locator("#event-start").fill("10:15");
        await page.locator("#event-end").fill("12:00");
        await page.locator("output").getByText("Duration 1h 45m", { exact: true }).waitFor();
        await page.locator("#event-end").fill("09:00");
        await page.getByText("End time must be after start time.", { exact: true }).waitFor();
        assert.equal(await page.locator("#event-end").evaluate((end) => end.validity.customError), true);
        assert.equal(await page.locator("output").count(), 0);
        await visit(page, "/events/event-1/edit", "Edit Event");
        await page.locator("output").getByText("Duration 2h", { exact: true }).waitFor();
        assert.equal(await page.locator("#event-date").inputValue(), "2026-11-25");
        const zone = role(page, "combobox", "Time zone");
        await zone.waitFor();
        await screenshot("edit");
        await screenshot("edit-lower", true);
        await page.locator("#event-end").fill("14:00");
        await page.getByText("End time must be after start time.", { exact: true }).waitFor();
        await screenshot("edit-error");
        await screenshot("edit-error-lower", true);
        await page.locator("#event-end").fill("17:00");
        await zone.fill("Paris");
        await zone.press("ArrowDown");
        await zone.press("Enter");
        assert.equal(await page.locator("[name=timezone]").inputValue(), "Europe/Paris");
        await assertFits(page);
      });

      await check(`loading, error, and empty Discover states remain distinct at ${width}px`, async () => {
        let release;
        const held = new Promise((resolve) => { release = resolve; });
        const fail = async (route) => {
          await held;
          await route.fulfill({ status: 503, json: { error: { message: "Check your connection and try again." } } });
        };
        await page.route("**/api/events", fail);
        try {
          await visit(page, "/events", "Discover Events");
          await page.getByRole("status").getByText("Loading events…").waitFor();
          await screenshot("events-loading");
        } finally {
          release();
        }
        await page.getByRole("alert").waitFor();
        await screenshot("events-error");
        await page.unroute("**/api/events", fail);
        await button(page, "Retry events").click();
        await link(page, "Board Game Night").waitFor();
        await page.locator("#event-search").fill("pottery");
        await page.getByRole("status").getByText("No matches").waitFor();
        await screenshot("events-empty");
        await page.locator("#event-search").fill(title);
        await link(page, title).waitFor();
        await screenshot("events-long");
      });

      await check(`My Profile retains identity, Edit Profile, My Events and Log Out at ${width}px`, async () => {
        await visit(page, "/profile", "My Profile");
        await heading(page, "Alex Morgan").waitFor();
        assert.equal(await page.getByText("@alexmorgan", { exact: true }).count(), 1);
        assert.equal(await page.locator(".user-profile-stats dt").count(), 3);
        await expectNav(page, "Profile");
        await screenshot("my-profile");
        await link(page, "Edit Profile").click();
        await page.locator("#username_field").waitFor();
        await screenshot("edit-profile");
        await screenshot("edit-profile-lower", true);
        await page.goBack();
        await link(page, "My Events").click();
        await heading(page, "My Events").waitFor();
        await visit(page, "/profile", "My Profile");
        await button(page, "Log Out").waitFor();
        await assertFits(page);
      });

      await check(`empty lists and unconnected profiles use server data at ${width}px`, async () => {
        await visit(page, "/discover/user-sam", "Sam Rivera");
        await button(page, "Send connection request").waitFor();
        await screenshot("profile-unconnected");
        const empty = await context.newPage();
        try {
          await empty.setViewportSize({ width, height: 852 });
          await visit(empty, "/discover", "Discover People");
          await empty.evaluate(() => sessionStorage.setItem("doin.currentUserId", "user-taylor"));
          await visit(empty, "/my-events?tab=joined", "My Events");
          await empty.getByText("You haven't joined any events yet.").waitFor();
          await capture(empty, "joined-empty", screenshots);
          await visit(empty, "/connections", "Connections");
          await empty.getByText("No incoming requests.").waitFor();
          await empty.getByText("No sent requests yet.").waitFor();
          await empty.getByText("No accepted connections yet.").waitFor();
          await capture(empty, "connections-empty", screenshots);
        } finally {
          await empty.close();
        }
      });
    }

    await check("attendee relationship mutation updates Suggested People across views", async () => {
      await visit(page, "/events/event-2", "Board Game Night");
      await button(page, "Show Attendees").click();
      await userLink(page, "Sam Rivera").click();
      await heading(page, "Sam Rivera").waitFor();
      await expectNav(page, "Events");
      await button(page, "Send connection request").click();
      await button(page, "Cancel request").waitFor();
      await button(page, "Back to Event Details").click();
      await userLink(page, "Sam Rivera").waitFor();
      await link(page.locator(".navbar"), "Connect").click();
      await userLink(section(page, "Outgoing requests"), "Sam Rivera").waitFor();
      const suggested = section(page, "Suggested People");
      assert.equal(await userLink(suggested, "Sam Rivera").count(), 0);
      await userLink(suggested, "Chris Nguyen").waitFor();
      await link(suggested, "Discover more people").click();
      await heading(page, "Discover People").waitFor();
      await expectNav(page, "People");
    });

    await check("real logout clears this tab's identity and blocks protected Back", async () => {
      await link(page.locator(".navbar"), "Profile").click();
      await heading(page, "My Profile").waitFor();
      await button(page, "Log Out").click();
      await heading(page, "Meet people. Do things together.").waitFor();
      assert.equal(await page.evaluate(() => sessionStorage.getItem("doin.currentUserId")), null);
      await page.goBack();
      await heading(page, "Meet people. Do things together.").waitFor();
      assert.equal(await page.locator(".navbar").count(), 0);
    });

    assert.deepEqual(errors, []);
    await writeFile(path.join(output, "manifest.json"), JSON.stringify({
      browser: browser.version(), scenarios, screenshots, phoneLayouts, errors,
    }, null, 2));
    console.log(`${scenarios.length} responsive navigation and workflow browser scenarios passed, ${screenshots.length} screenshots, zero uncaught page errors.`);
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
