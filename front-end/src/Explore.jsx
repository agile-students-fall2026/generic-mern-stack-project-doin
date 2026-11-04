import { useState } from "react";
import "./Explore.css";
import mockEvents from "./mockEvents";

function Explore({ onViewEvent, onCreateEvent, events = mockEvents }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const locations = [...new Set(events.map((event) => event.location))].sort();

  const categories = [...new Set(events.map((event) => event.category))].sort();

  const filteredEvents = events.filter((event) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      event.title.toLowerCase().includes(searchText) ||
      event.location.toLowerCase().includes(searchText) ||
      event.category.toLowerCase().includes(searchText);

    const matchesCategory =
      categoryFilter === "All" || event.category === categoryFilter;

    const matchesLocation =
      locationFilter === "All" || event.location === locationFilter;

    const matchesDate = dateFilter === "" || event.date === dateFilter;

    return matchesSearch && matchesCategory && matchesLocation && matchesDate;
  });

  return (
    <div className="explore">
      <h1>Discover events</h1>
      <hr />

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
        <label htmlFor="event-category-filter">Filter by category</label>

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

        <label htmlFor="event-location-filter">Filter by location</label>

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

        <label htmlFor="event-date-filter">Filter by date</label>

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

      {filteredEvents.map((event) => (
        <div className="event-card" key={event.id}>
          <img src={event.image} alt={event.title} />

          <div className="event-info">
            <h3>{event.title}</h3>
            <p>
              {event.date} {event.time} • {event.location}
            </p>

            <button onClick={() => onViewEvent(event)}>View event</button>
          </div>
        </div>
      ))}
      {filteredEvents.length === 0 && (
        <p role="status">No events match your search.</p>
      )}
    </div>
  );
}

export default Explore;
