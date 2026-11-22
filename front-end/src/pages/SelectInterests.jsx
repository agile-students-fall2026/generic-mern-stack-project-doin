import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getInterests, saveInterests } from "../api";
import useSubmission from "../useSubmission";
import "./Auth.css";
import "./SelectInterests.css";

export default function SelectInterests({ user, onUserChange }) {
  const [selectedInterests, setSelectedInterests] = useState(user.interests);
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const { pending, error, setError, submit } = useSubmission();
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    getInterests(controller.signal)
      .then((interests) => {
        if (!controller.signal.aborted) setCatalog(interests);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCatalogError(error.message);
      });
    return () => controller.abort();
  }, [catalogAttempt]);

  function retryCatalog() {
    setCatalogError("");
    setCatalogAttempt((previous) => previous + 1);
  }

  function toggleInterest(interest) {
    setError("");
    setSelectedInterests((previous) =>
      previous.includes(interest)
        ? previous.filter((item) => item !== interest)
        : [...previous, interest],
    );
  }

  function handleNext() {
    submit(
      (signal) => saveInterests(user.id, selectedInterests, signal),
      (updatedUser) => {
        onUserChange(updatedUser);
        navigate("/setup-profile");
      },
    );
  }

  return (
    <main className="interests-page">
      <div className="interests-container">
        <header className="interests-header">
          <h1>Your interests</h1>
        </header>

        <p className="interests-description">Select activities you enjoy</p>

        {catalogError ? (
          <div>
            <p className="auth-error" role="alert">{catalogError}</p>
            <button
              type="button"
              className="doin-button doin-button--secondary"
              onClick={retryCatalog}
            >
              Retry
            </button>
          </div>
        ) : catalog === null && (
          <p role="status">Loading interests…</p>
        )}

        <div className="interests-grid">
          {catalog?.map((interest) => (
            <button
              key={interest}
              type="button"
              className={
                "doin-button interest-option " +
                (selectedInterests.includes(interest)
                  ? "interest-option--selected"
                  : "")
              }
              aria-pressed={selectedInterests.includes(interest)}
              onClick={() => toggleInterest(interest)}
              disabled={pending}
            >
              {selectedInterests.includes(interest) ? "✓ " : ""}
              {interest}
            </button>
          ))}
        </div>

        <div className="interests-actions">
          {error && <p className="auth-error" role="alert">{error}</p>}

          <button
            type="button"
            className="doin-button interests-next"
            onClick={handleNext}
            disabled={catalog === null || pending}
          >
            {pending ? "Saving…" : selectedInterests.length === 0 ? "Skip" : "Next"}
          </button>

          <p>Step 1 of 2</p>
        </div>
      </div>
    </main>
  );
}
