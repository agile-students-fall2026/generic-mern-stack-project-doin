import { useState } from "react";
import { mockUsers } from "../mocks/users";
import mockDiscoverPeople from "../mockDiscoverPeople";
import "./Connections.css";

export default function Connections({ sentRequestIds, onSendRequest }) {
  const [pendingRequests, setPendingRequests] = useState(mockUsers.slice(0, 3));
  const [connectedUsers, setConnectedUsers] = useState(mockUsers.slice(3, 9));
  const suggestedUsers = mockUsers.slice(9, 12);
  const sentPeople = [
    ...mockDiscoverPeople.map((person) => ({
      id: person.id,
      name: person.name,
      imageUrl: person.image,
    })),
    ...suggestedUsers,
  ].filter((person) => sentRequestIds.includes(person.id));

  function handleAccept(user) {
    setPendingRequests((previous) =>
      previous.filter((person) => person.id !== user.id),
    );

    setConnectedUsers((previous) => [...previous, user]);
  }

  function handleDecline(user) {
    setPendingRequests((previous) =>
      previous.filter((person) => person.id !== user.id),
    );
  }

  function handleSendRequest(user) {
    onSendRequest(user.id);
  }

  return (
    <main className="connections-page">
      <div className="connections-container">
        <h1>Connections</h1>

        <section className="connections-section">
          <h2>Pending requests</h2>

          {pendingRequests.map((user) => (
            <div
              className="doin-card connection-user connection-request"
              key={user.id}
            >
              <img src={user.imageUrl} alt={user.name} />
              <span>{user.name}</span>
              <div className="connection-request-actions">
                <button
                  type="button"
                  className="doin-button doin-button--primary connection-accept"
                  onClick={() => handleAccept(user)}
                >
                  Accept
                </button>

                <button
                  type="button"
                  className="doin-button doin-button--secondary connection-decline"
                  onClick={() => handleDecline(user)}
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
              <img src={user.imageUrl} alt={user.name} />
              <span>{user.name}</span>
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
                <img src={person.imageUrl} alt={person.name} />
                <span>{person.name}</span>

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
              <img src={user.imageUrl} alt={user.name} />
              <span>{user.name}</span>

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
