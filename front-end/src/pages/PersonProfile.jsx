import { useRef, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router";
import { getUserById } from "../api";
import ConfirmationDialog from "../Components/ConfirmationDialog";
import useToast from "../useToast";
import Icon from "../Components/Icon";
import BackButton from "../Components/BackButton";
import normalizePerson from "../normalizePerson";
import PersonDetails from "../PersonDetails";
import useApiData from "../useApiData";
import { eventProfileOrigin, useReturnTo } from "../viewHistory";

export default function PersonProfile({ currentUser, relationships, refreshKey, fromConnections }) {
  const { personId } = useParams();
  const isOwnProfile = personId === currentUser.id;
  const personData = useApiData(isOwnProfile ? null : personId, getUserById, refreshKey);
  const { search } = useLocation();
  const eventOrigin = fromConnections ? "" : eventProfileOrigin(search);
  const onBack = useReturnTo(eventOrigin || (fromConnections ? "/connections" : "/discover"));
  const backLabel = eventOrigin ? "Event Details" : fromConnections ? "Connections" : "People";
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const fallbackFocus = useRef(null);
  const showSuccess = useToast();

  if (isOwnProfile) return <Navigate to="/profile" replace />;

  if (personData.loading || personData.error) {
    return (
      <main className="doin-page doin-page--app">
        <BackButton onClick={onBack} ariaLabel={`Back to ${backLabel}`} label={backLabel} />
        {personData.loading
          ? <p role="status">Loading profile...</p>
          : <p role="alert">{personData.error}</p>}
      </main>
    );
  }

  const person = normalizePerson(personData.data, currentUser.interests);
  const { data, loading, error, busy, actionError, pendingAction, disconnect, send, respond } = relationships;
  const connected = data?.connectedUsers.some((user) => user.id === personId);
  const incoming = data?.incomingRequests.find((request) => request.senderId === personId);
  const outgoing = data?.outgoingRequests.find((request) => request.recipientId === personId);

  return (
    <PersonDetails person={person} onBack={onBack} backLabel={backLabel} backAriaLabel={`Back to ${backLabel}`} headingRef={fallbackFocus}>
      {!confirmDisconnect && actionError && <p role="alert">{actionError}</p>}
      {loading && <p role="status">Loading connection status...</p>}
      {error && <p role="alert">{error}</p>}
      {connected && (
        <div className="user-profile-secondary-actions">
          <p className="profile-connection-status"><Icon name="check" /> Connected</p>
          <button type="button" className="doin-button doin-button--danger-outline" disabled={busy}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true });
              setConfirmDisconnect(true);
            }}>
            Disconnect
          </button>
        </div>
      )}
      <ConfirmationDialog
        action={confirmDisconnect ? {
          title: "Disconnect from this person?",
          description: `Remove your connection with ${person.name}? You can send another request later.`,
          confirmLabel: "Disconnect",
          dismissLabel: "Keep connection",
          pendingLabel: "Disconnecting…",
          destructive: true,
        } : null}
        pending={pendingAction?.type === "disconnect"}
        disabled={!connected || busy}
        error={actionError || (!connected ? "This connection no longer exists." : "")}
        onConfirm={async () => {
          if (await disconnect(personId)) {
            setConfirmDisconnect(false);
            personData.invalidate();
            showSuccess("Connection removed.");
          }
        }}
        onDismiss={() => setConfirmDisconnect(false)}
        fallbackFocusRef={fallbackFocus}
      />
      {incoming && !connected && (
        <div className="user-profile-secondary-actions">
          <button
            type="button"
            className="doin-button doin-button--primary"
            disabled={busy}
            onClick={async () => { if (await respond(incoming.id, "accepted")) personData.invalidate(); }}
          >
            Accept
          </button>
          <button
            type="button"
            className="doin-button doin-button--secondary"
            disabled={busy}
            onClick={() => respond(incoming.id, "declined")}
          >
            Decline
          </button>
        </div>
      )}
      {data && !connected && !incoming && (
        <button
          type="button"
          className={`doin-button doin-button--${outgoing ? "secondary" : "primary"}`}
          disabled={busy}
          onClick={() => outgoing ? respond(outgoing.id, "cancelled") : send(personId)}
        >
          {outgoing ? "Cancel request" : "Send connection request"}
        </button>
      )}
    </PersonDetails>
  );
}
