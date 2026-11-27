import { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { getUserById } from "../api";
import ConfirmationDialog from "../Components/ConfirmationDialog";
import useToast from "../useToast";
import BackButton from "../Components/BackButton";
import normalizePerson from "../normalizePerson";
import PersonDetails from "../PersonDetails";
import useApiData from "../useApiData";

export default function PersonProfile({ currentUser, relationships, refreshKey, fromConnections }) {
  const { personId } = useParams();
  const navigate = useNavigate();
  const personData = useApiData(personId, getUserById, refreshKey);
  const { state } = useLocation();
  const fromEvent = typeof state?.eventFrom === "string" && /^\/events\/[^/?#]+(?:\?.*)?$/.test(state.eventFrom);
  const onBack = () => navigate(fromEvent ? state.eventFrom : fromConnections ? "/connections" : "/discover");
  const backLabel = fromEvent ? "Back to event" : fromConnections ? "Back to connections" : "Back to discovery";
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const fallbackFocus = useRef(null);
  const showSuccess = useToast();

  if (personData.loading || personData.error) {
    return (
      <main className="doin-page">
        <BackButton onClick={onBack} ariaLabel={backLabel} />
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
    <PersonDetails person={person} onBack={onBack} backAriaLabel={backLabel} headingRef={fallbackFocus}>
      {!confirmDisconnect && actionError && <p role="alert">{actionError}</p>}
      {loading && <p role="status">Loading connection status...</p>}
      {error && <p role="alert">{error}</p>}
      {connected && (
        <>
          <p className="profile-connection-status">Connected</p>
          <button type="button" className="doin-button doin-button--danger-outline" disabled={busy}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true });
              setConfirmDisconnect(true);
            }}>
            Disconnect
          </button>
        </>
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
        <>
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
        </>
      )}
      {data && !connected && !incoming && personId !== currentUser.id && (
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
