import { useRef } from "react";
import "./DiscoverPeople.css";
import { getPeople } from "./api";
import useApiData from "./useApiData";
import BrowseFilters, { FilterChoice } from "./Components/BrowseFilters";
import PersonCard from "./Components/PersonCard";
import CatalogStatus from "./Components/CatalogStatus";
import Icon from "./Components/Icon";
import { useInterestCatalog } from "./useCatalog";
import { useViewState } from "./viewHistory";

function loadPeople(query, signal) {
  const [search, interest] = JSON.parse(query);
  return getPeople(search, interest, signal);
}

const initialFilters = { search: "", selected: [], open: false };

export default function DiscoverPeople({ refreshKey, userId, relationships }) {
  const [{ search, selected, open }, update] = useViewState(initialFilters);
  const summary = useRef(null);
  const catalog = useInterestCatalog();
  const query = JSON.stringify([search.trim(), selected.join(",")]);
  const directory = useApiData(query, loadPeople, refreshKey, 150);
  const { data, error: relationshipError, loading: checkingRelationships, refreshing, retry } = relationships;
  const waiting = directory.loading || checkingRelationships || refreshing;
  const error = relationshipError || directory.error;
  const excluded = new Set([userId, ...(data?.connectedUsers.map((person) => person.id) ?? [])]);
  const people = (directory.data ?? []).filter((person) => !excluded.has(person.id));

  function choose(interest, checked) {
    const next = checked ? [...selected, interest] : selected.filter((value) => value !== interest);
    update({ selected: next });
  }

  return (
    <main className="discover doin-page doin-page--app">
      <h1 className="doin-page-title">Discover People</h1>
      <div className="doin-search">
        <Icon name="search" />
        <label className="doin-sr-only" htmlFor="search_input">Search by name or username</label>
        <input id="search_input" className="doin-input" type="search"
          placeholder="Search by name or username" value={search}
          onChange={(event) => update({ search: event.target.value })} />
      </div>
      <BrowseFilters label="Interest filters" open={open} onToggle={(open) => update({ open })}
        active={selected.map((value) => [value, value])} summaryRef={summary} onClear={() => {
          update({ selected: [] });
          summary.current?.focus();
        }}>
        {catalog.data && (
          <fieldset>
            <legend>Interests</legend>
            <div className="browse-filter-choices">
              {catalog.data.map((interest) => (
                <FilterChoice key={interest} type="checkbox" name="interest" value={interest}
                  checked={selected.includes(interest)} onChange={(event) => choose(interest, event.target.checked)}>
                  {interest}
                </FilterChoice>
              ))}
            </div>
          </fieldset>
        )}
        {catalog.loading && <CatalogStatus catalog={catalog} label="Interests" />}
      </BrowseFilters>
      {catalog.error && <CatalogStatus catalog={catalog} label="Interests" />}

      <section className="browse-results" aria-label="People results">
        {waiting && <p role="status">Loading people...</p>}
        {!waiting && error && (
          <div className="browse-message">
            <p role="alert" className="doin-field-error">
              {relationshipError ? `Could not check your connections. ${relationshipError}` : error}
            </p>
            <button type="button" className="doin-button doin-button--secondary"
              onClick={relationshipError ? retry : directory.invalidate}>
              {relationshipError ? "Retry connections" : "Retry people"}
            </button>
          </div>
        )}
        {!waiting && !error && people.length === 0 && <p className="browse-message" role="status">No people found.</p>}
        {!waiting && !error && people.map((person) => <PersonCard person={person} key={person.id} />)}
      </section>
    </main>
  );
}
