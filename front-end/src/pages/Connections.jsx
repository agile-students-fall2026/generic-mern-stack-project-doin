import { Link } from "react-router";
import { mockUsers } from "../mocks/users";
import mockDiscoverPeople from "../mockDiscoverPeople";
import "./Connections.css";

function PersonLink({ person }) {
  return (
    <Link
      className="connection-profile-link"
      to={`/connections/${encodeURIComponent(person.id)}`}
      aria-label={`View ${person.name}'s profile`}
    >
      <img src={person.imageUrl} alt="" />
      <span>{person.name}</span>
    </Link>
  );
}

export default function Connections({
  sentRequestIds,
  onSendRequest,
  pendingRequests,
  connectedUsers,
  onAcceptRequest,
  onDeclineRequest,
}) {
  const suggestedUsers = mockUsers.slice(9, 12);
  const sentPeople = [
    ...mockDiscoverPeople.map((person) => ({
      id: person.id,
      name: person.name,
      imageUrl: person.image,
    })),
    ...suggestedUsers,
  ].filter((person) => sentRequestIds.includes(person.id));

  function handleSendRequest(user) {
    onSendRequest(user.id);
  }

  return (
    <main className="connections-page doin-page">
      <div className="connections-container">
        <h1 className="doin-page-title">Connections</h1>

        <section className="connections-section">
          <h2>Pending requests</h2>

          {pendingRequests.map((user) => (
            <div
              className="doin-card connection-user connection-request"
              key={user.id}
            >
              <PersonLink person={user} />
              <div className="connection-request-actions">
                <button
                  type="button"
                  className="doin-button doin-button--primary connection-accept"
                  onClick={() => onAcceptRequest(user)}
                >
                  Accept
                </button>

                <button
                  type="button"
                  className="doin-button doin-button--secondary connection-decline"
                  onClick={() => onDeclineRequest(user)}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="connections-section">
          <h2>Your connections</h2>

          {connectedUsers.map((user) => (
            <div className="doin-card connection-user" key={user.id}>
              <PersonLink person={user} />
            </div>
          ))}
        </section>

        <section className="connections-section">
          <h2>Sent requests ({sentPeople.length})</h2>

          {sentPeople.length === 0 ? (
            <p>No sent requests yet.</p>
          ) : (
            sentPeople.map((person) => (
              <div className="doin-card connection-user" key={person.id}>
                <PersonLink person={person} />

                <div className="connection-request-actions">
                  <button
                    type="button"
                    className="doin-button doin-button--secondary"
                    onClick={() => onSendRequest(person.id)}
                  >
                    Cancel request
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="connections-section">
          <h2>Suggested people</h2>

          {suggestedUsers.map((user) => (
            <div
              className="doin-card connection-user connection-request"
              key={user.id}
            >
              <PersonLink person={user} />

              <div className="connection-request-actions">
                <button
                  type="button"
                  className={
                    sentRequestIds.includes(user.id)
                      ? "doin-button doin-button--secondary"
                      : "doin-button doin-button--primary"
                  }
                  onClick={() => handleSendRequest(user)}
                >
                  {sentRequestIds.includes(user.id)
                    ? "Cancel request"
                    : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
