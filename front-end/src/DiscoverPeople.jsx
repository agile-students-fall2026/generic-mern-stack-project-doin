import { useState } from "react";
import "./DiscoverPeople.css";
import SearchBar from "./SearchBar";
import { getPeople } from "./api";
import useApiData from "./useApiData";
import Avatar from "./Components/Avatar";
import CatalogStatus from "./Components/CatalogStatus";
import { useInterestCatalog } from "./useCatalog";

function loadPeople(query, signal) {
  const [search, interest] = JSON.parse(query);
  return getPeople(search, interest, signal);
}

function DiscoverPeople({ onViewProfile, refreshKey }) {
  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState("All");
  const catalog = useInterestCatalog();
  const query = JSON.stringify([search.trim(), interest]);
  const { data: people = [], error, loading } = useApiData(query, loadPeople, refreshKey, 150);

  return (
    <div className="discover doin-page">
      <h1 className="doin-page-title">Discover people</h1>

      <SearchBar
        label="Search by name or username"
        value={search}
        onChange={setSearch}
      />

      <div className="filters">
        <label className="doin-label" htmlFor="interest-filter">Filter by interest</label>
        <select
          className="doin-input"
          id="interest-filter"
          value={interest}
          disabled={!catalog.data}
          onChange={(e) => setInterest(e.target.value)}
        >
          <option value="All">All interests</option>
          {catalog.data?.map((option) => <option key={option}>{option}</option>)}
        </select>
        <CatalogStatus catalog={catalog} label="Interests" />
      </div>

      {loading && <p role="status">Loading people...</p>}

      {!loading && error && <p role="alert">{error}</p>}

      {!loading && !error && people.length === 0 && <p role="status">No people found.</p>}

      {!loading &&
        !error &&
        people.map((person) => (
          <div className="person-card" key={person.id}>
            <Avatar src={person.imageUrl} />

            <div className="person-info">
              <h3>{person.name}</h3>
              <p>{person.interests.join(" • ")}</p>
              <button type="button" className="doin-button doin-button--primary"
                onClick={() => onViewProfile(person)}>
                View profile
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

export default DiscoverPeople;
