import { useEffect, useState } from "react";
import "./DiscoverPeople.css";
import SearchBar from "./SearchBar";
import { getPeople } from "./api";

function DiscoverPeople({ onViewProfile }) {
  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState("All");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The list comes from the back end (#101). Changing the search text or
  // the interest sends a new request, and the server does the filtering
  // (#100), so this page only shows what the server returns.
  useEffect(() => {
    let active = true;
    setLoading(true);
    getPeople(search, interest)
      .then((data) => {
        if (active) {
          setPeople(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setPeople([]);
          setError("People could not be loaded. Please try again.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [search, interest]);

  return (
    <div className="discover doin-page">
      <h1 className="doin-page-title">Discover people</h1>

      <SearchBar
        label="Search by interest or name"
        value={search}
        onChange={setSearch}
      />

      <div className="filters">
        <label htmlFor="interest-filter">Filter by interest</label>
        <select
          id="interest-filter"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
        >
          <option value="All">All interests</option>
          <option value="Coffee">Coffee</option>
          <option value="Hiking">Hiking</option>
          <option value="Music">Music</option>
          <option value="Sports">Sports</option>
        </select>
      </div>

      {loading && <p>Loading people...</p>}

      {!loading && error && <p>{error}</p>}

      {!loading && !error && people.length === 0 && <p>No people found.</p>}

      {!loading &&
        !error &&
        people.map((person) => (
          <div className="person-card" key={person.id}>
            <img src={person.imageUrl} alt={person.name} />

            <div className="person-info">
              <h3>{person.name}</h3>
              <p>{person.interests.join(" • ")}</p>
              <button onClick={() => onViewProfile(person)}>View profile</button>
            </div>
          </div>
        ))}
    </div>
  );
}

export default DiscoverPeople;
