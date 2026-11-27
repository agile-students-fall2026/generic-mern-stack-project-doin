import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import EventForm from "../Components/EventForm";
import { getEvent, updateEvent } from "../api";
import useApiData from "../useApiData";
import useToast from "../useToast";
import { useReturnTo } from "../viewHistory";

export default function EditEvent({ userId }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { search, state } = useLocation();
  const showSuccess = useToast();
  const { data: event, loading, error, invalidate, invalidated } = useApiData(eventId, getEvent);
  const [blocked, setBlocked] = useState(false);
  const detailsPath = `/events/${encodeURIComponent(eventId)}${search}`;
  const backToDetails = useReturnTo(detailsPath);
  const editOrigin = state?.origin === "/my-events?tab=hosting" ? state.origin : undefined;

  function returnToEvent() {
    if (editOrigin) navigate(detailsPath, { replace: true, state: { origin: editOrigin } });
    else backToDetails();
  }

  if (loading) return <p className="doin-page" role="status">Loading event...</p>;

  const permissionError = event && (
    event.organizerId !== userId ? "Only the event organizer can edit this event."
      : event.status !== "active" ? "Canceled events cannot be edited." : ""
  );

  if (error || permissionError) {
    return (
      <main className="create-event-page doin-page">
        <h1 className="doin-page-title">Edit Event</h1>
        <p role="alert" className="doin-field-error">{error || permissionError}</p>
        <div className="event-form-actions">
          {error && (
            <button className="doin-button doin-button--secondary" type="button"
              onClick={invalidate} disabled={invalidated}>
              Retry
            </button>
          )}
          <Link className="doin-button doin-button--secondary" to={detailsPath}>Back to event</Link>
        </div>
      </main>
    );
  }

  async function saveChanges(fields, signal) {
    try {
      return await updateEvent(eventId, fields, signal);
    } catch (error) {
      if (!signal.aborted && ([403, 404].includes(error.status) || error.code === "EVENT_UNAVAILABLE")) setBlocked(true);
      throw error;
    }
  }

  return (
    <EventForm
      event={event}
      blocked={blocked}
      onSave={saveChanges}
      onSuccess={() => {
        showSuccess("Event changes saved.");
        returnToEvent();
      }}
      onCancel={returnToEvent}
      backLabel="Event Details"
    />
  );
}
