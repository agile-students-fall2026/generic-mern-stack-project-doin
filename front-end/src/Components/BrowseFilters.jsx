import Icon from "./Icon";
import "./BrowseFilters.css";

export function FilterChoice({ type, name, value, checked, onChange, children }) {
  return (
    <label className="browse-filter-choice">
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

export default function BrowseFilters({ label, open, onToggle, active, onClear, summaryRef, className = "", children }) {
  return (
    <>
      <details className={`browse-filters ${className}`} open={open}
        onToggle={(event) => { if (event.currentTarget.open !== open) onToggle(event.currentTarget.open); }}>
        <summary className="browse-filter-toggle" ref={summaryRef}>
          <Icon name="filters" />
          {label}
          {active.length > 0 && <span className="browse-filter-count">{active.length}</span>}
          <Icon name="down" className="browse-filter-chevron" />
        </summary>
        <div className="browse-filter-panel">
          {children}
          {active.length > 0 && (
            <button className="doin-button browse-clear-filters" type="button" onClick={onClear}>
              Clear filters
            </button>
          )}
        </div>
      </details>
      {active.length > 0 && (
        <ul className="browse-active-filters" aria-label="Active filters">
          {active.map(([name, value]) => <li key={name}>{value}</li>)}
        </ul>
      )}
    </>
  );
}
