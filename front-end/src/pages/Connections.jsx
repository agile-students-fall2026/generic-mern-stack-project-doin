import { Link } from "react-router";
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
  connectedUsers,
  onAcceptRequest,
  onDeclineRequest,
  incomingRequests,
  outgoingRequests,
  requestUsers,
  onCancelRequest,
  updatingRequestId,
  loading,
  error,
  suggestedUsers=[],
}) {

  
  const incomingPeople = incomingRequests.map((request) => ({
  ...requestUsers[request.senderId],
  id: request.senderId,
  requestId: request.id,
}));
  
const sentPeople = outgoingRequests.map((request) => ({
  ...requestUsers[request.recipientId],
  id: request.recipientId,
  requestId: request.id,
}));

  function handleSuggestedRequest(user) {
    const existingRequest = outgoingRequests.find(
    (request) => request.recipientId === user.id
    );

    if (existingRequest) {
      onCancelRequest({ requestId: existingRequest.id });
    } else {
      onSendRequest(user.id);
    }
  }

  return (
    <main className="connections-page doin-page">
      <div className="connections-container">
        <h1 className="doin-page-title">Connections</h1>
        {loading && <p role="status">Loading connections...</p>}
        {error && <p role="alert">{error}</p>}

        <section className="connections-section">
          <h2>Pending requests</h2>

          {incomingPeople.map((user) => (
            <div
              className="doin-card connection-user connection-request"
              key={user.requestIdid}
            >
              <PersonLink person={user} />
              <div className="connection-request-actions">
                <button
                  type="button"
                  className="doin-button doin-button--primary connection-accept"
                  onClick={() => onAcceptRequest(user)}
                  disabled={updatingRequestId !== null}
                >
                  Accept
                </button>

                <button
                  type="button"
                  className="doin-button doin-button--secondary connection-decline"
                  onClick={() => onDeclineRequest(user)}
                  disabled={updatingRequestId !== null}
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
                    onClick={() => onCancelRequest(person)}
                    disabled={updatingRequestId !== null}
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
                  onClick={() => handleSuggestedRequest(user)}
                  disabled={updatingRequestId !== null}
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
