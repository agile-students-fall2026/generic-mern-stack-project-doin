import { Link } from "react-router";
import Avatar from "../Components/Avatar";
import { getUserById, getUsers } from "../api";
import useApiData from "../useApiData";
import "./Connections.css";

function PersonLink({ person }) {
  return (
    <Link
      className="connection-profile-link"
      to={`/connections/${encodeURIComponent(person.id)}`}
      aria-label={`View ${person.name}'s profile`}
    >
      <Avatar src={person.imageUrl} className="connection-avatar" />
      <div className="connection-identity">
        <span className="connection-name">{person.name}</span>
        {person.username && <span className="connection-username">@{person.username.replace(/^@/, "")}</span>}
      </div>
    </Link>
  );
}

function ConnectionCard({ person, kind, children }) {
  return (
    <article className={`doin-card connection-user connection-${kind}`}>
      <PersonLink person={person} />
      {children && <div className="connection-request-actions">{children}</div>}
    </article>
  );
}

const loadDirectory = (_, signal) => getUsers(signal);

function loadRequestProfiles(key, signal) {
  return Promise.all(JSON.parse(key).map((id) => getUserById(id, signal)));
}

export default function Connections({ userId, relationships, refreshKey }) {
  const { data, error, actionError, busy, pendingAction, refreshing, send, respond } = relationships;
  const { connectedUsers = [], incomingRequests = [], outgoingRequests = [] } = data ?? {};
  const directory = useApiData(userId, loadDirectory, refreshKey);
  const availableUsers = directory.data ?? [];
  const profiles = new Map([...availableUsers, ...connectedUsers].map((person) => [person.id, person]));
  const pendingIds = [
    ...incomingRequests.map((request) => request.senderId),
    ...outgoingRequests.map((request) => request.recipientId),
  ];
  const missingIds = [...new Set(pendingIds.filter((id) => !profiles.has(id)))].sort();
  const requestProfiles = useApiData(
    !directory.loading && missingIds.length > 0 ? JSON.stringify(missingIds) : null,
    loadRequestProfiles,
    refreshKey,
  );
  for (const person of requestProfiles.data ?? []) {
    profiles.set(person.id, person);
  }

  const requestPerson = (id, requestId) => ({
    ...(profiles.get(id) ?? { id, name: "Profile unavailable" }),
    requestId,
  });
  const incomingPeople = incomingRequests.map((request) => requestPerson(request.senderId, request.id));
  const sentPeople = outgoingRequests.map((request) => requestPerson(request.recipientId, request.id));
  const connectedIds = new Set(connectedUsers.map((person) => person.id));
  const incomingIds = new Set(incomingPeople.map((person) => person.id));
  const outgoingIds = new Set(sentPeople.map((person) => person.id));
  const suggestedUsers = availableUsers.filter((person) =>
    !connectedIds.has(person.id) && !incomingIds.has(person.id) && !outgoingIds.has(person.id)
  ).slice(0, 3);
  const loading = relationships.loading || directory.loading || requestProfiles.loading;

  function actionProps(id, type) {
    return { disabled: busy, "aria-busy": pendingAction?.id === id && pendingAction?.type === type };
  }

  return (
    <main className="connections-page doin-page">
      <h1 className="doin-page-title">Connections</h1>
      {actionError && <p className="doin-field-error connection-message" role="alert">{actionError}</p>}
      {error && <p className="doin-field-error connection-message" role="alert">{error}</p>}
      {busy && <p className="doin-sr-only" role="status">Updating connections…</p>}
      {!error && loading && <p role="status">Loading connections...</p>}
      {!error && !loading && data && (
        <>
          {directory.error && (
            <p className="doin-field-error connection-message" role="alert">
              Suggestions could not be loaded. {directory.error}
            </p>
          )}
          {requestProfiles.error && (
            <p className="doin-field-error connection-message" role="alert">
              Request profiles could not be loaded. {requestProfiles.error}
            </p>
          )}

          <section className="connections-section">
            <h2>Pending requests</h2>
            {incomingPeople.length === 0 && !refreshing && <p className="connection-empty">No pending requests.</p>}
            {incomingPeople.map((user) => (
              <ConnectionCard person={user} kind="request" key={user.requestId}>
                <button
                  type="button"
                  className="doin-button doin-button--primary connection-accept"
                  onClick={() => respond(user.requestId, "accepted")}
                  {...actionProps(user.requestId, "accepted")}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="doin-button doin-button--secondary connection-decline"
                  onClick={() => respond(user.requestId, "declined")}
                  {...actionProps(user.requestId, "declined")}
                >
                  Decline
                </button>
              </ConnectionCard>
            ))}
          </section>

          <section className="connections-section">
            <h2>Your connections</h2>
            {connectedUsers.length === 0 && (refreshing
              ? <p role="status">Checking for connections...</p>
              : <p className="connection-empty">You have no connections yet.</p>)}
            {connectedUsers.map((user) => (
              <ConnectionCard person={user} kind="accepted" key={user.id} />
            ))}
          </section>

          <section className="connections-section">
            <h2>Sent requests ({sentPeople.length})</h2>
            {sentPeople.length === 0 && <p className="connection-empty">No sent requests yet.</p>}
            {sentPeople.map((person) => (
              <ConnectionCard person={person} kind="outgoing" key={person.id}>
                <button
                  type="button"
                  className="doin-button doin-button--danger-outline"
                  onClick={() => respond(person.requestId, "cancelled")}
                  {...actionProps(person.requestId, "cancelled")}
                >
                  Cancel request
                </button>
              </ConnectionCard>
            ))}
          </section>

          <section className="connections-section">
            <h2>Suggested people</h2>
            {suggestedUsers.map((user) => (
              <ConnectionCard person={user} kind="suggested" key={user.id}>
                <button
                  type="button"
                  className="doin-button doin-button--primary"
                  onClick={() => send(user.id)}
                  {...actionProps(user.id, "send")}
                >
                  Connect
                </button>
              </ConnectionCard>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
