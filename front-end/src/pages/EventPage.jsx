import { useLocation, useParams } from "react-router";
import { getEvent, getUserById } from "../api";
import useApiData from "../useApiData";
import { useReturnTo } from "../viewHistory";
import BackButton from "../Components/BackButton";
import EventDetails from "./EventDetails";

export default function EventPage({ currentUser, refreshKey }) {
  const { eventId } = useParams();
  const { search, state } = useLocation();
  const from = new URLSearchParams(search).get("from");
  const fromList = from === "joined" || from === "hosting";
  const backTo = fromList ? `/my-events?tab=${from}` : "/events";
  const backLabel = from === "joined" ? "Joined" : from === "hosting" ? "Hosting" : "Discover Events";
  const onBack = useReturnTo(backTo, state?.origin === backTo || (from === "joined" && state?.origin === "/my-events"));
  const eventData = useApiData(eventId, getEvent, refreshKey);
  const event = eventData.data;
  const organizer = useApiData(event?.organizerId ?? null, getUserById, refreshKey);
  const isHost = event?.organizerId === currentUser.id;
  const organizerProfile = organizer.data ?? (isHost ? currentUser : null);

  if (eventData.loading) return <p className="event-details doin-page doin-page--app" role="status">Loading event details...</p>;

  if (eventData.error) {
    return (
      <main className="event-details doin-page doin-page--app">
        <BackButton onClick={onBack} ariaLabel={`Back to ${backLabel}`} label={backLabel} />
        <div className="browse-message">
          <p role="alert" className="doin-field-error">{eventData.error}</p>
          <button className="doin-button doin-button--secondary" type="button" onClick={eventData.invalidate}>Retry event</button>
        </div>
      </main>
    );
  }

  return (
    <EventDetails
      event={{
        ...event,
        organizer: organizerProfile?.name || event.organizerName || event.organizerId || "Unknown organizer",
        organizerImage: organizerProfile?.imageUrl,
      }}
      currentUser={currentUser}
      canManage={isHost && event.status === "active"}
      onBack={onBack}
      backLabel={backLabel}
      editSearch={search}
      onCanceled={onBack}
      onEventChange={eventData.replace}
      onConflict={eventData.invalidate}
      refreshKey={refreshKey}
    />
  );
}
