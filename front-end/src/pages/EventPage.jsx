import { useLocation, useNavigate, useParams } from "react-router";
import { getEvent, getUserById } from "../api";
import useApiData from "../useApiData";
import EventDetails from "./EventDetails";

export default function EventPage({ currentUser, refreshKey }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const from = new URLSearchParams(search).get("from");
  const fromList = from === "joined" || from === "hosting";
  const backTo = fromList ? `/my-events?tab=${from}` : "/events";
  const eventData = useApiData(eventId, getEvent, refreshKey);
  const event = eventData.data;
  const organizer = useApiData(event?.organizerId ?? null, getUserById, refreshKey);
  const onBack = () => navigate(backTo);

  if (eventData.loading) return <p className="event-details doin-page" role="status">Loading event details...</p>;

  if (eventData.error) {
    return (
      <main className="event-details doin-page">
        <p role="alert" className="doin-field-error">{eventData.error}</p>
        <button type="button" className="doin-button doin-button--secondary" onClick={onBack}>
          {fromList ? "Back to My Events" : "Back to events"}
        </button>
      </main>
    );
  }

  return (
    <EventDetails
      event={{
        ...event,
        organizer: organizer.data?.name || event.organizerName || event.organizerId || "Unknown organizer",
        organizerImage: organizer.data?.imageUrl,
      }}
      currentUser={currentUser}
      canManage={currentUser.id === event.organizerId && event.status === "active"}
      onBack={onBack}
      backLabel={fromList ? "Back to My Events" : "Back to events"}
      eventLocation={pathname + search}
      editSearch={search}
      onCanceled={onBack}
      onEventChange={eventData.replace}
      onConflict={eventData.invalidate}
      refreshKey={refreshKey}
    />
  );
}
