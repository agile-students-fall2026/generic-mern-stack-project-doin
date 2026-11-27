const assert = require("node:assert/strict");
const { once } = require("node:events");
const { mkdir, mkdtemp, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const clientDirectory = path.resolve(process.env.DOIN_CLIENT_DIR ?? path.join(root, "front-end/dist"));
const width = 393;
const height = 852;
const password = "DoinBrowser1!";
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
const cases = [];
const errors = [];
const failures = [];
let origin;
let output;

const button = (scope, name) => scope.getByRole("button", { name, exact: true });
const heading = (page, name) => page.getByRole("heading", { name, exact: true });
const dialog = (page, name) => page.getByRole("dialog", { name, exact: true });
const notification = (page) => page.getByRole("region", { name: "Notification" });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function test(name, run) {
  await run();
  cases.push(name);
  console.log("PASS " + name);
}

async function send(request, method, route, expected, data, userId) {
  const response = await request.fetch(origin + "/api" + route, {
    method, data, headers: userId ? { "Mock-User-Id": userId } : {},
  });
  assert.equal(response.status(), expected, route);
  return response.json();
}

async function createProfile(context, name, username) {
  const email = username + "@example.test";
  const user = await send(context.request, "POST", "/auth/register", 201, { name, email, password });
  await send(context.request, "POST", "/profiles", 200, {
    username, location: "New York, NY", bio: "Coffee, sketchbooks, and slow weekends in the city.",
    interests: ["Coffee", "Art"],
  }, user.id);
  const page = await context.newPage();
  await page.goto(origin + "/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await button(page, "Log in").click();
  await heading(page, "Discover People").waitFor();
  return { page, user };
}

async function visit(page, route, title) {
  await page.goto(origin + route);
  await heading(page, title).waitFor();
}

async function capture(page, file) {
  if (!file) return;
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: path.join(output, file + ".png"), scale: "css" });
}

async function geometry(locator) {
  const box = await locator.boundingBox();
  assert(box, "Expected a visible control");
  return box;
}

async function hasFocus(locator) {
  assert(await locator.evaluate((node) => document.activeElement === node), "Expected keyboard focus");
}

async function assertSize(locator) {
  const box = await geometry(locator);
  assert(box.width >= 44 && box.height >= 44, JSON.stringify(box));
}

async function assertClearOfOverlay(page, locator) {
  const target = await geometry(locator);
  const navbar = await geometry(page.locator(".navbar"));
  assert(target.y + target.height <= navbar.y, "Control is behind the bottom nav");
  if (await notification(page).count()) {
    const toast = await geometry(notification(page));
    assert(toast.y + toast.height <= target.y || target.y + target.height <= toast.y, "Toast covers the control");
  }
}

async function expectToast(page, message) {
  const toast = notification(page);
  await toast.getByText(message, { exact: true }).waitFor();
  assert.equal(await toast.count(), 1);
  await page.getByRole("status").filter({ hasText: message }).waitFor({ state: "attached" });
  assert.equal(await toast.getAttribute("popover"), "manual");
  return toast;
}

async function withResponse(page, method, endpoint, status, action) {
  const [response] = await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api" + endpoint && response.request().method() === method),
    action(),
  ]);
  assert.equal(response.status(), status);
  return response.json();
}

async function fillEvent(page) {
  for (const [name, value] of Object.entries({
    title: "Shared UI Event Form Check",
    description: draft.description,
    date: draft.date,
    start: draft.startTime,
    end: draft.endTime,
    location: draft.location,
    capacity: String(draft.capacity),
  })) {
    await page.locator("#event-" + name).fill(value);
  }
  await page.locator("#event-category").selectOption(draft.category);
}

async function main() {
  output = process.env.DOIN_BROWSER_OUTPUT_DIR ?? await mkdtemp(path.join(os.tmpdir(), "doin-shared-ui-"));
  await mkdir(output, { recursive: true });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const { createApp } = await import(pathToFileURL(path.join(root, "back-end/src/app.js")));
  const server = createApp({ clientDirectory }).listen(0, "127.0.0.1");
  let browser;
  try {
    await once(server, "listening");
    origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({ headless: true });
    const options = { viewport: { width, height }, isMobile: true, hasTouch: true, locale: "en-US" };
    const contexts = await Promise.all([browser.newContext(options), browser.newContext(options)]);
    for (const context of contexts) {
      await context.route("https://picsum.photos/**", (route) => route.abort());
      context.on("page", (page) => {
        page.setDefaultTimeout(6500);
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("response", (response) => {
          if (response.url().startsWith(origin) && response.status() >= 400) {
            failures.push([response.status(), new URL(response.url()).pathname]);
          }
        });
      });
    }

    const { page: host, user: organizer } = await createProfile(contexts[0], "Maya Rivera", "mayarivera");
    const { page: guest, user: attendee } = await createProfile(contexts[1], "Noah Bennett", "noahbennett");
    const event = await send(host.request, "POST", "/events", 201, draft, organizer.id);
    const eventPath = "/events/" + event.id;
    const rsvpPath = eventPath + "/rsvp";
    await send(host.request, "POST", rsvpPath, 200, undefined, "user-alex");
    await send(guest.request, "POST", "/connections/requests", 201, { recipientId: organizer.id }, attendee.id);
    const accepted = await send(host.request, "POST", "/connections/requests", 201, { recipientId: organizer.id }, "user-jordan");
    await send(host.request, "PATCH", "/connections/requests/" + accepted.id, 200, { status: "accepted" }, organizer.id);

    await test("shared controls, category contrast, and keyboard focus", async () => {
      await visit(host, "/events", "Discover Events");
      await heading(host, "Tennis Meetup").waitFor();
      await capture(host, "06-event-discovery");
      const create = host.getByRole("link", { name: "Create event", exact: true });
      await assertSize(create);
      await assertSize(host.locator(".navbar").getByRole("link", { name: "Events" }));
      await assertSize(host.locator(".event-card-link").first());
      await host.keyboard.press("Tab");
      await hasFocus(create);
      assert.deepEqual(await create.evaluate((node) => {
        const style = getComputedStyle(node);
        return [style.outlineStyle, style.outlineWidth, style.backgroundColor];
      }), ["solid", "2px", "rgb(80, 71, 229)"]);
      await capture(host, "keyboard-focus");
      await visit(host, eventPath, event.title);
      await host.getByText("Organized by Maya Rivera").waitFor();
      assert.deepEqual(await host.locator(".event-details-header .event-card-category").evaluate((node) => {
        const style = getComputedStyle(node);
        return [style.color, style.backgroundColor];
      }), ["rgb(71, 64, 160)", "rgb(238, 237, 255)"]);
      await capture(host, "12-event-details-host");
    });

    await test("RSVP dialog names, keyboard dismissal, focus restoration, and no mutation", async () => {
      await visit(guest, eventPath, event.title);
      await guest.getByText("Organized by Maya Rivera").waitFor();
      await capture(guest, "08-event-details-attendee");
      const join = button(guest, "Join Event");
      await join.focus();
      await guest.keyboard.press("Enter");
      const prompt = dialog(guest, "Confirm RSVP");
      await prompt.waitFor();
      await hasFocus(button(prompt, "Confirm RSVP"));
      assert.match(await prompt.getAttribute("aria-describedby"), /\S/);
      await capture(guest, "10-rsvp-confirmation");
      await guest.keyboard.press("Shift+Tab");
      await hasFocus(button(prompt, "Cancel"));
      await guest.keyboard.press("Escape");
      await prompt.waitFor({ state: "hidden" });
      await hasFocus(join);
      const status = await send(guest.request, "GET", eventPath, 200);
      assert.deepEqual(status.attendeeIds, ["user-alex"]);
    });

    await test("pending RSVP prevents duplicate submissions and keeps recoverable errors visible", async () => {
      let attempted = 0;
      let release;
      let observed;
      const hold = new Promise((resolve) => { release = resolve; });
      const first = new Promise((resolve) => { observed = resolve; });
      const pattern = "**/api" + rsvpPath;
      const fault = async (route) => {
        attempted += 1;
        observed();
        await hold;
        await route.fulfill({
          status: 503, json: { error: { code: "RSVP_TEMPORARILY_UNAVAILABLE", message: "RSVP temporarily unavailable." } },
        });
      };
      await guest.route(pattern, fault);
      try {
        await button(guest, "Join Event").click();
        const prompt = dialog(guest, "Confirm RSVP");
        const confirm = button(prompt, "Confirm RSVP");
        await confirm.dblclick();
        await first;
        assert.equal(await button(prompt, "Joining…").isDisabled(), true);
        assert.equal(await button(prompt, "Joining…").evaluate((node) => getComputedStyle(node).cursor), "progress");
        await guest.keyboard.press("Escape");
        assert.equal(await prompt.isVisible(), true);
        await guest.keyboard.press("Enter");
        assert.equal(attempted, 1);
        await capture(guest, "rsvp-pending");
        release();
        await prompt.getByRole("alert").filter({ hasText: "RSVP temporarily unavailable." }).waitFor();
        assert.equal(await confirm.isEnabled(), true);
        assert.equal(await notification(guest).count(), 0);
        await wait(3200);
        assert.equal(await prompt.getByRole("alert").isVisible(), true);
        await capture(guest, "rsvp-error");
      } finally {
        release();
        await guest.unroute(pattern, fault);
      }
    });

    await test("successful RSVP updates the attendee list and pauses the toast during interaction", async () => {
      const prompt = dialog(guest, "Confirm RSVP");
      const updated = await withResponse(guest, "POST", rsvpPath, 200, () => button(prompt, "Confirm RSVP").click());
      assert.deepEqual(updated.attendeeIds, ["user-alex", attendee.id]);
      await prompt.waitFor({ state: "hidden" });
      const toast = await expectToast(guest, "RSVP confirmed.");
      const leave = button(guest, "Leave Event");
      await hasFocus(leave);
      await assertClearOfOverlay(guest, leave);
      await capture(guest, "11-rsvp-success");
      const dismiss = button(toast, "Dismiss notification");
      await dismiss.focus();
      await wait(3200);
      assert.equal(await toast.isVisible(), true);
      await dismiss.press("Enter");
      await toast.waitFor({ state: "hidden" });
      await hasFocus(leave);
    });

    await test("destructive Leave dialog starts on Keep RSVP and success auto-dismisses", async () => {
      await button(guest, "Leave Event").click();
      const prompt = dialog(guest, "Leave Event?");
      await hasFocus(button(prompt, "Keep RSVP"));
      const destructive = button(prompt, "Confirm Leave");
      assert.equal(await destructive.evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(164, 37, 49)");
      await capture(guest, "leave-confirmation");
      const updated = await withResponse(guest, "DELETE", rsvpPath, 200, () => destructive.click());
      assert.deepEqual(updated.attendeeIds, ["user-alex"]);
      const toast = await expectToast(guest, "You left the event.");
      const shownAt = Date.now();
      await toast.waitFor({ state: "hidden", timeout: 4500 });
      assert(Date.now() - shownAt >= 2300, "Toast disappeared too soon");
    });

    await test("form validation, native controls, touch sizes, and navbar clearance", async () => {
      await visit(host, "/create-event", "Create an Event");
      await host.locator("#event-category").waitFor();
      await capture(host, "15-create-event");
      await fillEvent(host);
      await host.locator("#event-end").fill("09:00");
      const create = button(host, "Create Event");
      await create.click();
      const end = host.getByLabel("Ends at", { exact: true });
      await hasFocus(end);
      assert.equal(await end.getAttribute("type"), "time");
      assert.equal(await end.getAttribute("aria-invalid"), "true");
      assert.equal(await end.getAttribute("aria-describedby"), "event-timezone-hint event-time-error");
      await host.getByRole("alert").filter({ hasText: "End time must be after start time." }).waitFor();
      assert.equal(await host.getByLabel("Date", { exact: true }).getAttribute("type"), "date");
      assert.equal(await host.getByLabel("Event Name", { exact: true }).getAttribute("required"), "");
      await capture(host, "form-validation");
      await create.evaluate((node) => node.scrollIntoView({ block: "end" }));
      await assertSize(create);
      await assertClearOfOverlay(host, create);
    });

    let createdPath;
    await test("event creation toast survives navigation to the server-created event", async () => {
      await host.locator("#event-end").fill(draft.endTime);
      const created = await withResponse(host, "POST", "/events", 201, () => button(host, "Create Event").click());
      createdPath = "/events/" + created.id;
      await heading(host, created.title).waitFor();
      assert.equal(new URL(host.url()).pathname, createdPath);
      const toast = await expectToast(host, "Event created.");
      await button(host, "Cancel Event").evaluate((node) => node.scrollIntoView({ block: "end" }));
      await assertClearOfOverlay(host, button(host, "Cancel Event"));
      await capture(host, "event-created-toast");
      const bounds = await geometry(toast);
      await host.mouse.move(bounds.x + 14, bounds.y + bounds.height / 2);
      await wait(3200);
      assert.equal(await toast.isVisible(), true);
      await button(toast, "Dismiss notification").click();
    });

    await test("edit form pre-fills editable capacity and shows route-persistent save feedback", async () => {
      await visit(host, eventPath + "/edit", "Edit Event");
      await host.getByLabel("Category", { exact: true }).waitFor();
      await capture(host, "17-edit-event");
      const capacity = host.locator("#event-capacity");
      assert.equal(await capacity.inputValue(), String(draft.capacity));
      const zone = host.getByRole("combobox", { name: "Time zone" });
      await zone.fill("Nowhere");
      await host.getByText("No matching time zones.", { exact: false }).waitFor();
      await zone.fill("New York");
      await zone.press("ArrowDown");
      await zone.press("Enter");
      const save = button(host, "Save changes");
      await withResponse(host, "PATCH", eventPath, 200, () => save.click());
      await heading(host, event.title).waitFor();
      assert.equal(new URL(host.url()).pathname, eventPath);
      await expectToast(host, "Event changes saved.");
    });

    await test("profile save stays visible after the route transition", async () => {
      await visit(host, "/edit-profile", "Edit Profile");
      await host.locator("#bio_field").fill("Shared UI test profile");
      await withResponse(host, "PATCH", "/users/" + organizer.id, 200, () => button(host, "Save changes").click());
      await heading(host, "My Profile").waitFor();
      await expectToast(host, "Profile saved.");
      await capture(host, "profile-saved-toast");
    });

    await test("organizer cancellation favors Keep event and uses the existing DELETE API", async () => {
      await visit(host, createdPath, "Shared UI Event Form Check");
      const cancel = button(host, "Cancel Event");
      await cancel.click();
      const prompt = dialog(host, "Cancel this event?");
      await hasFocus(button(prompt, "Keep event"));
      await capture(host, "cancel-confirmation");
      await host.keyboard.press("Escape");
      await prompt.waitFor({ state: "hidden" });
      await hasFocus(cancel);
      assert.equal((await send(host.request, "GET", createdPath, 200)).status, "active");
      await cancel.click();
      const result = await withResponse(host, "DELETE", createdPath, 200,
        () => button(prompt, "Cancel Event").click());
      assert.equal(result.status, "cancelled");
      await heading(host, "Discover Events").waitFor();
      await expectToast(host, "Event canceled.");
    });

    await test("onboarding toast survives setup and clears on logout without native Popover support", async () => {
      const page = await contexts[1].newPage();
      await page.addInitScript(() => { delete HTMLElement.prototype.showPopover; });
      const user = await send(page.request, "POST", "/auth/register", 201, {
        name: "Jamie Perez", email: "jamie@example.test", password,
      });
      await page.goto(origin + "/login");
      await page.evaluate((userId) => sessionStorage.setItem("doin.currentUserId", userId), user.id);
      await visit(page, "/setup-profile", "Set up your profile");
      await page.locator("#username").fill("jamieperez");
      await withResponse(page, "POST", "/profiles", 200, () => button(page, "Finish setup").click());
      await heading(page, "My Profile").waitFor();
      const toast = notification(page);
      await toast.getByText("Profile saved.", { exact: true }).waitFor();
      assert.equal(await toast.getAttribute("popover"), null);
      await assertClearOfOverlay(page, page.getByRole("link", { name: "Edit Profile", exact: true }));
      await button(page, "Log Out").click();
      await toast.waitFor({ state: "hidden" });
      assert.equal(new URL(page.url()).pathname, "/");
      await page.close();
    });

    for (const viewportWidth of [320, 375, 393, 430, 1280]) {
      await test("no horizontal overflow or obscured featured controls at " + viewportWidth + " px", async () => {
        await host.setViewportSize({ width: viewportWidth, height });
        await visit(host, "/connections", "Connections");
        const accept = button(host, "Accept");
        await accept.waitFor();
        await assertSize(accept);
        await assertSize(button(host, "Decline"));
        await assertClearOfOverlay(host, accept);
        assert.equal(await host.evaluate(() => document.documentElement.scrollWidth), viewportWidth);
        if (viewportWidth === width) await capture(host, "19-connections");
        await visit(host, eventPath, event.title);
        const cancel = button(host, "Cancel Event");
        await assertSize(cancel);
        await cancel.click();
        const prompt = dialog(host, "Cancel this event?");
        const rect = await geometry(prompt);
        assert(rect.x >= 0 && rect.x + rect.width <= viewportWidth);
        assert.equal(await host.evaluate(() => document.documentElement.scrollWidth), viewportWidth);
        await button(prompt, "Keep event").click();
        await visit(host, "/create-event", "Create an Event");
        await host.getByLabel("Category", { exact: true }).waitFor();
        const submit = button(host, "Create Event");
        await submit.evaluate((node) => node.scrollIntoView({ block: "end" }));
        await assertSize(submit);
        await assertClearOfOverlay(host, submit);
        assert.equal(await host.evaluate(() => document.documentElement.scrollWidth), viewportWidth);
      });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, [[503, "/api" + rsvpPath]]);
    await writeFile(path.join(output, "results.json"), JSON.stringify({ cases, errors, failures }, null, 2));
    console.log(cases.length + " shared UI browser scenarios passed. Screenshots and evidence in " + output);
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
