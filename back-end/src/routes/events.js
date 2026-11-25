
import { Router } from "express";
import { store } from "../data/store.js";
const router = Router();


router.get("/", (req, res) => {
    const { search, category, location, date } = req.query;

    // Reject repeated parameters and non-string values.
    const filters = { search, category, location, date };

    for (const [name, value] of Object.entries(filters)) {
        if (value !== undefined && typeof value !== "string") {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: `Invalid ${name} filter.`,
                },
            });
        }
    }

    let events = store.events.filter(
        (event) => event.status === "active"
    );

    // Search title, location, and category.
    if (search?.trim()) {
        const term = search.trim().toLowerCase();

        events = events.filter((event) =>
            [event.title, event.location, event.category].some(
                (value) => value.toLowerCase().includes(term)
            )
        );
    }

    // Filter by category, including supported aliases.
    if (category?.trim()) {
        const input = category.trim().toLowerCase();

        const aliases = {
            arts: "art",
            gaming: "games",
        };

        const normalizedCategory = aliases[input] ?? input;

        events = events.filter(
            (event) =>
                event.category.toLowerCase() === normalizedCategory
        );
    }

    // Filter by location.
    if (location?.trim()) {
        const term = location.trim().toLowerCase();

        events = events.filter((event) =>
            event.location.toLowerCase().includes(term)
        );
    }

    // Filter by event date.
    if (date?.trim()) {
        const selectedDate = date.trim();

        const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate);
        const parsedDate = new Date(`${selectedDate}T00:00:00Z`);

        const validDate =
            validFormat &&
            !Number.isNaN(parsedDate.getTime()) &&
            parsedDate.toISOString().slice(0, 10) === selectedDate;

        if (!validDate) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid date filter.",
                },
            });
        }

        events = events.filter(
            (event) => event.date === selectedDate
        );
    }

    return res.status(200).json(events);
});


// Get details of one event using its ID.

router.get("/categories", (_req, res) => {
    res.json(store.categories);
});
router.get("/:eventId", (req, res) => {
    const event = store.events.find(
        (item) => item.id === req.params.eventId,
    );

    if (!event) {
        return res.status(404).json({
            error: {
                code: "NOT_FOUND",
                message: "Event not found.",
            },
        });
    }

    res.json(event);
});

export default router;
