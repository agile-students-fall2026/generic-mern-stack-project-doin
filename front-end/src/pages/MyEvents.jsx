import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import ConfirmationDialog from "../Components/ConfirmationDialog";
import { cancelEventAction } from "../eventActions";
import useSubmission from "../useSubmission";
import useToast from "../useToast";
import EventCard from "../Components/EventCard";
import EventsTabs from "../Components/EventsTabs";
import "../styles/MyEvents.css";

export default function MyEvents({ events, currentUser, loading, refreshing, error, onChange }) {
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") === "hosting" ? "hosting" : "joined";
  const [cancelTarget, setCancelTarget] = useState(null);
  const headingRef = useRef(null);
  const showSuccess = useToast();
  const cancellation = useSubmission();
  const action = cancelTarget ? cancelEventAction(cancelTarget.title) : null;
  const stillHosting = events?.some((event) => event.id === cancelTarget?.id);

  function confirmCancellation() {
    cancellation.submit(async (signal) => {
      try {
        return await action.send(cancelTarget.id, signal);
      } catch (error) {
        if (!signal.aborted && [404, 409].includes(error.status)) onChange();
        throw error;
      }
    }, () => {
      setCancelTarget(null);
      onChange();
      showSuccess(action.success);
    });
  }
  const userId = currentUser?.id;
  const joinedEvents = events?.filter((event) => userId && event.organizerId !== userId && event.attendeeIds?.includes(userId)) ?? [];
  const hostingEvents = events?.filter((event) => userId && event.organizerId === userId) ?? [];
  const hosting = activeTab === "hosting";
  const displayedEvents = hosting ? hostingEvents : joinedEvents;
  const waiting = loading || (refreshing && displayedEvents.length === 0);

  return (
    <main className="my-events-page doin-page">
      <EventsTabs />
      <h1 className="doin-page-title" ref={headingRef} tabIndex={-1}>My Events</h1>

      <div className="my-events-tabs" role="group" aria-label="My event lists">
        {[["joined", "Joined", joinedEvents], ["hosting", "Hosting", hostingEvents]].map(([type, label, list]) => (
          <button
            type="button"
            key={type}
            className={`doin-button doin-button--${activeTab === type ? "primary" : "secondary"}`}
            aria-pressed={activeTab === type}
            aria-controls="my-events-results"
            onClick={() => setParams({ tab: type }, { replace: true })}
          >
            {label}{!loading && !error && ` (${list.length})`}
          </button>
        ))}
      </div>

      <section id="my-events-results" className="my-events-list" aria-label={hosting ? "Hosting events" : "Joined events"}>
        {!error && waiting && <p role="status">Loading your events...</p>}
        {error && <p role="alert" className="doin-field-error my-events-message">{error}</p>}
        {!waiting && !error && (
          displayedEvents.length > 0
            ? displayedEvents.map((event) => (
                <EventCard key={event.id} event={event} className="my-event-card" from={activeTab}>
                  {hosting && (
                    <>
                      <Link
                        className="doin-button doin-button--secondary my-event-edit-link"
                        to={`/events/${encodeURIComponent(event.id)}/edit?from=hosting`}
                        aria-label={`Edit Event: ${event.title}`}
                      >
                        Edit Event
                      </Link>
                      <button type="button" className="doin-button doin-button--danger-outline"
                        aria-label={`Cancel Event: ${event.title}`}
                        onClick={(click) => {
                          click.currentTarget.focus({ preventScroll: true });
                          cancellation.setError("");
                          setCancelTarget(event);
                        }}>
                        Cancel Event
                      </button>
                    </>
                  )}
                </EventCard>
              ))
            : <p className="my-events-message" role="status">
                {hosting ? "You haven't created any events yet." : "You haven't joined any events yet."}
              </p>
        )}
      </section>
      <ConfirmationDialog action={action} pending={cancellation.pending} disabled={!stillHosting}
        error={cancellation.error || (action && !stillHosting ? "This event is no longer available." : "")}
        onConfirm={confirmCancellation} onDismiss={() => setCancelTarget(null)} fallbackFocusRef={headingRef} />
    </main>
  );
}
