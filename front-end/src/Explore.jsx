
import { useEffect, useState } from "react";
import EventsTabs from "./Components/EventsTabs";
import "./Explore.css";
import { getEventCategories, searchEvents } from "./api";

function Explore({ onViewEvent, onCreateEvent, events = [] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const [categories, setCategories] = useState([]);
  const [filteredResults, setFilteredResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get categories from the Express backend.
  useEffect(() => {
    const controller = new AbortController();

    getEventCategories(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCategories(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      });

    return () => controller.abort();
  }, []);

  const locations = [
    ...new Set(events.map((event) => event.location)),
  ].sort();

  const hasFilters =
    search.trim() !== "" ||
    categoryFilter !== "All" ||
    locationFilter !== "All" ||
    dateFilter !== "";

  // Search and filter through the backend.
  useEffect(() => {
    if (!hasFilters) {
  setFilteredResults(null);
  setLoading(false);
  setError("");
  return;
}

    const controller = new AbortController();

    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      searchEvents(
        {
          search,
          category: categoryFilter,
          location: locationFilter,
          date: dateFilter,
        },
        controller.signal
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setFilteredResults(data);
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setError(err.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, categoryFilter, locationFilter, dateFilter, hasFilters]);

  const filteredEvents = hasFilters
    ? (filteredResults ?? [])
    : events;

  return (
    <div className="explore doin-page">
      <EventsTabs />
      <h1 className="doin-page-title">Discover events</h1>

      <button
        type="button"
        className="doin-button doin-button--primary create-event"
        onClick={onCreateEvent}
      >
        + Create event
      </button>

      <label htmlFor="event-search">Search events</label>
      <input
        id="event-search"
        type="search"
        placeholder="Search by name, location, or category"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="event-filters">
        <label htmlFor="event-category-filter">
          Filter by category
        </label>

        <select
          id="event-category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All categories</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <label htmlFor="event-location-filter">
          Filter by location
        </label>

        <select
          id="event-location-filter"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="All">All locations</option>

          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>

        <label htmlFor="event-date-filter">
          Filter by date
        </label>

        <input
          id="event-date-filter"
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />

        {dateFilter && (
          <button
            type="button"
            className="doin-button doin-button--secondary"
            onClick={() => setDateFilter("")}
          >
            Clear date
          </button>
        )}
      </div>

      {loading && <p role="status">Searching events...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading &&
        !error &&
        filteredEvents.map((event) => (
          <div className="event-card" key={event.id}>
            <img
              src={event.imageUrl ?? event.image}
              alt={event.title}
            />

            <div className="event-info">
              <h3>{event.title}</h3>
              <p>
                {event.date} {event.startTime ?? event.time} •{" "}
                {event.location}
              </p>

              <button
                type="button"
                onClick={() => onViewEvent(event)}
              >
                View event
              </button>
            </div>
          </div>
        ))}

      {!loading && !error && filteredEvents.length === 0 && (
        <p role="status">No events match your search.</p>
      )}
    </div>
  );
}

export default Explore;
