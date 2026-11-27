import { useRef, useState } from "react";
import { Link } from "react-router";
import CatalogStatus from "./Components/CatalogStatus";
import EventCard from "./Components/EventCard";
import EventsTabs from "./Components/EventsTabs";
import { getEvents, searchEvents } from "./api";
import { formatEventDate } from "./eventFormat";
import useApiData from "./useApiData";
import { useEventCategoryCatalog } from "./useCatalog";
import "./Explore.css";

const loadEvents = (_, signal) => getEvents(signal);
const loadFilteredEvents = (query, signal) => searchEvents(JSON.parse(query), signal);

export default function Explore({ refreshKey }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const filterSummary = useRef(null);
  const searchInput = useRef(null);

  const activeFilters = [
    ["category", category],
    ["location", location],
    ["date", formatEventDate(date) || date],
  ].filter(([, value]) => value);
  const hasQuery = Boolean(search.trim() || activeFilters.length);
  const query = hasQuery ? JSON.stringify({ search: search.trim(), category, location, date }) : null;

  const catalog = useEventCategoryCatalog();
  const allEvents = useApiData("events", loadEvents, refreshKey);
  const filteredEvents = useApiData(query, loadFilteredEvents, refreshKey, 250);
  const results = hasQuery ? filteredEvents : allEvents;
  const waiting = results.loading || (results.invalidated && !results.data);
  const events = results.data ?? [];
  const locations = [...new Set((allEvents.data ?? []).map((event) => event.location))].sort();
  if (location && !locations.includes(location)) locations.push(location);

  function clearFilters() {
    setCategory("");
    setLocation("");
    setDate("");
    filterSummary.current?.focus();
  }

  return (
    <main className="explore doin-page">
      <EventsTabs />
      <div className="explore-title-row">
        <h1 className="doin-page-title">Discover events</h1>
        <Link className="doin-button doin-button--primary explore-create" to="/create-event">
          <span aria-hidden="true">+</span> Create event
        </Link>
      </div>

      <div className="event-browse-controls">
        <label className="doin-sr-only" htmlFor="event-search">Search events</label>
        <input
          className="doin-input"
          id="event-search"
          type="search"
          placeholder="Search events"
          ref={searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <details className="event-filters">
          <summary className="doin-button doin-button--secondary event-filter-toggle" ref={filterSummary}>
            Filters{activeFilters.length > 0 && ` (${activeFilters.length})`}
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="event-filter-fields">
            <div className="event-filter-field">
              <label className="doin-label" htmlFor="event-category-filter">Category</label>
              <select
                className="doin-input"
                id="event-category-filter"
                value={category}
                disabled={!catalog.data}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {catalog.data?.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="event-filter-field">
              <label className="doin-label" htmlFor="event-location-filter">Location</label>
              <select
                className="doin-input"
                id="event-location-filter"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              >
                <option value="">All locations</option>
                {locations.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="event-filter-field event-filter-date">
              <label className="doin-label" htmlFor="event-date-filter">Date</label>
              <input
                className="doin-input"
                id="event-date-filter"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            {catalog.loading && <CatalogStatus catalog={catalog} label="Categories" />}
          </div>
        </details>

        {activeFilters.length > 0 && (
          <div className="event-active-filters">
            <ul aria-label="Active filters">
              {activeFilters.map(([name, value]) => <li key={name}>{value}</li>)}
            </ul>
            <button type="button" className="doin-button doin-button--secondary" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}

        {catalog.error && (
          <div className="event-results-message">
            <CatalogStatus catalog={catalog} label="Categories" onRetry={() => {
              filterSummary.current?.focus();
              catalog.invalidate();
            }} />
          </div>
        )}
      </div>

      <section className="event-results" aria-label="Event results">
        {waiting && <p role="status">{hasQuery ? "Searching events…" : "Loading events…"}</p>}
        {!waiting && results.error && (
          <div className="event-results-message">
            <p role="alert" className="doin-field-error">Events could not be loaded. {results.error}</p>
            <button type="button" className="doin-button doin-button--secondary" onClick={() => {
              searchInput.current?.focus();
              results.invalidate();
            }}>
              Retry events
            </button>
          </div>
        )}
        {!waiting && !results.error && (
          events.length > 0
            ? events.map((event) => <EventCard key={event.id} event={event} />)
            : <p className="event-results-message" role="status">
                {hasQuery ? "No events match your search." : "No events available yet."}
              </p>
        )}
      </section>
    </main>
  );
}
