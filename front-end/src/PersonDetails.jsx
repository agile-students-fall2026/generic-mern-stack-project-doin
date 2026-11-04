import "./PersonDetails.css";

function PersonDetails({ person, onBack, requested, onRequest }) {
  return (
    <main className="person-details-page">
      <div className="doin-card person-details-card">
        <h1>{person.name}</h1>
        <hr />

        <img
          className="person-details-photo"
          src={person.image}
          alt={person.name}
        />

        <h3>{person.hobbies.join(" • ")}</h3>

        <h3>About {person.name.split(" ")[0]}</h3>
        <p>{person.bio}</p>

        <h3>Shared interests</h3>
        <div className="person-details-interests">
          {person.sharedInterests.join(" • ")}
        </div>

        <button
          type="button"
          className={
            requested
              ? "doin-button doin-button--secondary"
              : "doin-button doin-button--primary"
          }
          onClick={onRequest}
        >
          {requested ? "Cancel request" : "Send connection request"}
        </button>

        <button className="doin-button doin-button--secondary" onClick={onBack}>
          Back to discovery
        </button>
      </div>
    </main>
  );
}

export default PersonDetails;
