
import { expect } from "chai";
import request from "supertest";
import app from "../src/app.js";
import { resetStore } from "../src/data/store.js";

describe("[Elize] Events API", () => {
    beforeEach(() => {
        resetStore();
    });

    it("returns all active events", async () => {
        const response = await request(app).get("/api/events");

        expect(response.status).to.equal(200);
        expect(response.body).to.be.an("array");
    });

    it("returns one event by ID", async () => {
        const response = await request(app).get("/api/events/event-1");

        expect(response.status).to.equal(200);
        expect(response.body.id).to.equal("event-1");
    });

    it("filters events by category", async () => {
        const response = await request(app).get(
            "/api/events?category=Sports"
        );

        expect(response.status).to.equal(200);
        expect(response.body).to.be.an("array");
        expect(response.body).to.have.lengthOf(1);
        expect(response.body[0].id).to.equal("event-1");
        expect(response.body[0].category).to.equal("Sports");
        expect(response.body.map((event) => event.id)).to.not.include("event-2");
    });

    it("searches events by title", async () => {
        const response = await request(app).get(
            "/api/events?search=Tennis"
        );

        expect(response.status).to.equal(200);
        expect(response.body).to.be.an("array");
        expect(response.body).to.have.lengthOf(1);
        expect(response.body[0].id).to.equal("event-1");
        expect(response.body[0].title).to.equal("Tennis Meetup");
        expect(response.body.map((event) => event.id)).to.not.include("event-2");
    });
    it("returns an empty array when no events match the search", async () => {
        const response = await request(app).get(
            "/api/events?search=NoMatchingEvent123"
        );

        expect(response.status).to.equal(200);
        expect(response.body).to.deep.equal([]);
    });

    it("returns 404 for an unknown event", async () => {
        const response = await request(app).get(
            "/api/events/unknown"
        );

        expect(response.status).to.equal(404);
        expect(response.body.error.code).to.equal("NOT_FOUND");
    });
});
