export default function CatalogStatus({ catalog, label, onRetry = catalog.invalidate }) {
  if (catalog.loading || catalog.invalidated) {
    return <p role="status">Loading {label.toLowerCase()}…</p>;
  }
  if (!catalog.error) return null;

  return (
    <>
      <p className="doin-field-error" role="alert">{label} could not be loaded. {catalog.error}</p>
      <button type="button" className="doin-button doin-button--secondary" onClick={onRetry}>
        Retry {label.toLowerCase()}
      </button>
    </>
  );
}
