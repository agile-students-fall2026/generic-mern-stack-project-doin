import { useState } from "react";
import { mockUsers } from "../mocks/users";
import "./Connections.css";

export default function Connections() {
  const [pendingRequests, setPendingRequests] = useState(mockUsers.slice(0, 3));
  const [connectedUsers, setConnectedUsers] = useState(mockUsers.slice(3, 9));
  const [sentRequests, setSentRequests] = useState([]);
  const suggestedUsers = mockUsers.slice(9, 12);

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
    setSentRequests((previous) => [...previous, user.id]);
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
                    sentRequests.includes(user.id)
                      ? "doin-button doin-button--secondary"
                      : "doin-button doin-button--primary"
                  }
                  onClick={() => handleSendRequest(user)}
                  disabled={sentRequests.includes(user.id)}
                >
                  {sentRequests.includes(user.id) ? "Request sent" : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
