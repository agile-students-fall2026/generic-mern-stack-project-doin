import { useState } from "react";
import { useNavigate } from "react-router";
import { saveInterests } from "../api";
import CatalogStatus from "../Components/CatalogStatus";
import { useInterestCatalog } from "../useCatalog";
import useSubmission from "../useSubmission";
import "./Auth.css";
import "./SelectInterests.css";

export default function SelectInterests({ user, onUserChange }) {
  const [selectedInterests, setSelectedInterests] = useState(user.interests);
  const catalog = useInterestCatalog();
  const { pending, error, setError, submit } = useSubmission();
  const navigate = useNavigate();

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

        <CatalogStatus catalog={catalog} label="Interests" />

        <div className="interests-grid">
          {catalog.data?.map((interest) => (
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
          {error && <p className="doin-field-error" role="alert">{error}</p>}

          <button
            type="button"
            className="doin-button doin-button--primary interests-next"
            aria-busy={pending}
            onClick={handleNext}
            disabled={!catalog.data || pending}
          >
            {pending ? "Saving…" : selectedInterests.length === 0 ? "Skip" : "Next"}
          </button>

          <p>Step 1 of 2</p>
        </div>
      </div>
    </main>
  );
}
