import { useRef } from "react";
import { Link } from "react-router";
import BrowseFilters, { FilterChoice } from "./Components/BrowseFilters";
import CatalogStatus from "./Components/CatalogStatus";
import EventCard from "./Components/EventCard";
import EventsTabs from "./Components/EventsTabs";
import Icon from "./Components/Icon";
import { getEvents, searchEvents } from "./api";
import { formatEventDate } from "./eventFormat";
import useApiData from "./useApiData";
import { useEventCategoryCatalog } from "./useCatalog";
import { useOrigin, useViewState } from "./viewHistory";
import "./Explore.css";

const loadEvents = (_, signal) => getEvents(signal);
const loadFilteredEvents = (query, signal) => searchEvents(JSON.parse(query), signal);
const initialFilters = { search: "", category: "", location: "", date: "", open: false };

export default function Explore({ refreshKey, userId }) {
  const [{ search, category, location, date, open }, update] = useViewState(initialFilters);
  const origin = useOrigin();
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
  const events = (results.data ?? []).filter((event) => event.organizerId !== userId);
  const locations = [...new Set((allEvents.data ?? [])
    .filter((event) => event.organizerId !== userId).map((event) => event.location))].sort();
  if (location && !locations.includes(location)) locations.push(location);

  function clearFilters() {
    update({ category: "", location: "", date: "" });
    filterSummary.current?.focus();
  }

  return (
    <main className="explore doin-page doin-page--app">
      <header className="doin-title-row">
        <h1 className="doin-page-title">Discover Events</h1>
        <Link className="doin-button doin-button--primary explore-create" to="/create-event" state={origin} aria-label="Create event">
          <Icon name="plus" /> Create
        </Link>
      </header>
      <EventsTabs />
      <div className="doin-search">
        <Icon name="search" />
        <label className="doin-sr-only" htmlFor="event-search">Search events</label>
        <input className="doin-input" id="event-search" type="search" placeholder="Search events, categories, or places"
          ref={searchInput} value={search} onChange={(event) => update({ search: event.target.value })} />
      </div>

      <BrowseFilters className="event-filters" label="Filters" open={open} onToggle={(open) => update({ open })}
        active={activeFilters} summaryRef={filterSummary} onClear={clearFilters}>
        {catalog.data && (
          <fieldset>
            <legend>Category</legend>
            <div className="browse-filter-choices">
              {["", ...catalog.data].map((value) => (
                <FilterChoice key={value} type="radio" name="event-category" value={value}
                  checked={category === value} onChange={() => update({ category: value })}>
                  {value || "All categories"}
                </FilterChoice>
              ))}
            </div>
          </fieldset>
        )}
        <div className="event-filter-fields">
          <div>
            <label htmlFor="event-location-filter">Location</label>
            <select className="doin-input" id="event-location-filter" value={location}
              onChange={(event) => update({ location: event.target.value })}>
              <option value="">All locations</option>
              {locations.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="event-date-filter">Date</label>
            <input className="doin-input" id="event-date-filter" type="date" value={date}
              onChange={(event) => update({ date: event.target.value })} />
          </div>
        </div>
        {catalog.loading && <CatalogStatus catalog={catalog} label="Categories" />}
      </BrowseFilters>

      {catalog.error && (
        <div className="browse-message">
          <CatalogStatus catalog={catalog} label="Categories" onRetry={() => {
            filterSummary.current?.focus();
            catalog.invalidate();
          }} />
        </div>
      )}

      <section className="browse-results event-results" aria-label="Event results">
        {waiting && (
          <div className="browse-message" role="status"><h2>{hasQuery ? "Searching events…" : "Loading events…"}</h2></div>
        )}
        {!waiting && results.error && (
          <div className="browse-message browse-message-error event-results-message">
            <h2><Icon name="warning" /> Couldn’t load events</h2>
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
            ? events.map((event) => (
              <EventCard key={event.id} event={event} joined={event.attendeeIds?.includes(userId)} />
            ))
            : <div className="browse-message event-results-message" role="status">
                <h2>{hasQuery ? "No matches" : "No events yet"}</h2>
                <p>{hasQuery ? "No events match your search." : "No events available yet."}</p>
              </div>
        )}
      </section>
    </main>
  );
}
