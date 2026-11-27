import { useId, useRef, useState } from "react";
import { Link } from "react-router";
import Avatar from "../Components/Avatar";
import BackButton from "../Components/BackButton";
import ConfirmationDialog from "../Components/ConfirmationDialog";
import EventArtwork from "../Components/EventArtwork";
import LocationIcon from "../Components/LocationIcon";
import "../styles/EventDetails.css";
import { getUserById, joinEvent, leaveEvent } from "../api";
import { formatEventDate, formatEventTimeRange, formatEventTimeZone } from "../eventFormat";
import useApiData from "../useApiData";
import useSubmission from "../useSubmission";
import useToast from "../useToast";
import { cancelEventAction } from "../eventActions";

const eventActions = {
  join: {
    title: "Confirm RSVP",
    confirmLabel: "Confirm RSVP",
    dismissLabel: "Cancel",
    pendingLabel: "Joining…",
    success: "RSVP confirmed.",
    send: joinEvent,
  },
  leave: {
    title: "Leave Event?",
    confirmLabel: "Confirm Leave",
    dismissLabel: "Keep RSVP",
    pendingLabel: "Leaving…",
    success: "You left the event.",
    send: leaveEvent,
    destructive: true,
  },

};

async function loadAttendees(key, signal) {
  const results = await Promise.allSettled(JSON.parse(key).map((id) => getUserById(id, signal)));
  const users = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  return { users, partial: users.length !== results.length };
}

function EventInformation({ event }) {
  const date = formatEventDate(event.date, { includeYear: true });
  const time = formatEventTimeRange(event.startTime, event.endTime);
  const zone = formatEventTimeZone(event.timezone, { long: true });

  return (
    <dl className="event-info">
      {date && (
        <div>
          <dt className="doin-sr-only">Date</dt>
          <dd>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M7 3v4m10-4v4M3 10h18" />
            </svg>
            <time dateTime={event.date}>{date}</time>
          </dd>
        </div>
      )}
      {time && (
        <div>
          <dt className="doin-sr-only">Time</dt>
          <dd>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>{time}{zone && <span className="event-time-zone"> · {zone}</span>}</span>
          </dd>
        </div>
      )}
      {event.location && (
        <div>
          <dt className="doin-sr-only">Location</dt>
          <dd className="event-location"><LocationIcon /><span>{event.location}</span></dd>
        </div>
      )}
    </dl>
  );
}

function unavailableReason(action, { cancelled, isAttending, isFull, canManage }) {
  if (cancelled) return "This event was canceled.";
  if (action === "join" && isAttending) return "You already joined this event.";
  if (action === "join" && isFull) return "This event is full.";
  if (action === "leave" && !isAttending) return "Your RSVP has already been removed.";
  if (action === "cancel" && !canManage) return "Cancellation is no longer available.";
  return "";
}

const EventDetails = (props) => {
  const event = props.event;
  const currentUser = props.currentUser;
  const onBack = props.onBack;
  const [showAttendees, setShowAttendees] = useState(false);
  const attendeeListId = useId();
  const attendeeIds = (event.attendeeIds ?? []).filter((id) => id !== event.organizerId);
  const isHost = currentUser?.id === event.organizerId;
  const cancelled = event.status === "cancelled";
  const attendees = useApiData(
    showAttendees && attendeeIds.length > 0 ? JSON.stringify(attendeeIds) : null,
    loadAttendees,
    props.refreshKey,
  );
  const [confirmation, setConfirmation] = useState("");
  const headingRef = useRef(null);
  const { pending, error, setError, submit } = useSubmission();
  const showSuccess = useToast();

  const isAttending = currentUser && attendeeIds.includes(currentUser.id);
  const isFull = attendeeIds.length >= event.capacity;
  const remaining = Math.max(0, event.capacity - attendeeIds.length);
  const spots = `${remaining} ${remaining === 1 ? "spot" : "spots"} remaining`;
  const action = confirmation === "cancel" ? cancelEventAction(event.title) : eventActions[confirmation];
  const date = formatEventDate(event.date);
  const descriptions = {
    join: `Join ${event.title} at ${event.location}${date ? ` on ${date}` : ""}?`,
    leave: "Your RSVP will be removed and your spot will become available.",
  };
  const unavailable = action && unavailableReason(confirmation, { cancelled, isAttending, isFull, canManage: props.canManage });
  const actionDisabled = !currentUser || Boolean(unavailable);

  function openConfirmation(event, nextAction) {
    if (pending) return;
    event.currentTarget.focus({ preventScroll: true });
    setError("");
    setConfirmation(nextAction);
  }

  function submitAction() {
    if (!action || pending || actionDisabled) return;

    submit(async (signal) => {
      try {
        return await action.send(event.id, signal);
      } catch (error) {
        if (!signal.aborted && (error.status === 404 || error.status === 409)) props.onConflict();
        throw error;
      }
    }, (updatedEvent) => {
      setConfirmation("");
      showSuccess(action.success);
      if (confirmation === "cancel") props.onCanceled();
      else props.onEventChange(updatedEvent);
    });
  }

  return (
    <main className="event-details doin-page">
      {onBack && <BackButton onClick={onBack} ariaLabel={props.backLabel ?? "Back to events"} />}

      <article className="event-details-card">
        <EventArtwork className="event-details-image" src={event.imageUrl} />

        <div className="event-details-content">
          <header className="event-details-header">
            <span className="event-card-category">{event.category}</span>
            <h1 ref={headingRef} tabIndex={-1}>{event.title}</h1>
            <div className="event-organizer">
              <Link to={`/discover/${encodeURIComponent(event.organizerId)}`}
                state={{ eventFrom: props.eventLocation }} className="event-organizer-link">
                <Avatar src={event.organizerImage} className="event-organizer-avatar" />
                <span>Organized by {event.organizer}</span>
              </Link>
              {isHost && <span className="event-hosted-state">Hosted by you</span>}
            </div>
          </header>

          {cancelled && <p role="status" className="event-cancelled">This event was canceled.</p>}
          <EventInformation event={event} />

          <section className="event-section event-attendance">
            <h2>Who's going?</h2>
            <div className="attendee-summary">
              <p className="attendee-count">{attendeeIds.length} of {event.capacity} attending</p>
              <p className="spots-remaining">{cancelled ? "RSVP closed" : spots}</p>
              <div className="attendee-progress" aria-hidden="true">
                <div
                  className="attendee-progress-fill"
                  style={{
                    width: `${event.capacity > 0 ? Math.min(100, (attendeeIds.length / event.capacity) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="event-participation-actions">
              {currentUser && !isHost && !cancelled && (
                <div className="rsvp-actions">
                  <button
                    type="button"
                    className={`doin-button doin-button--${isAttending ? "secondary" : "primary"}`}
                    disabled={!isAttending && isFull}
                    onClick={(event) => openConfirmation(event, isAttending ? "leave" : "join")}
                  >
                    {isAttending ? "Leave Event" : isFull ? "Event Full" : "Join Event"}
                  </button>
                </div>
              )}

              <button
                type="button"
                className="doin-button doin-button--secondary attendee-toggle"
                onClick={() => setShowAttendees((open) => !open)}
                aria-expanded={showAttendees}
                aria-controls={attendeeListId}
              >
                {showAttendees ? "Hide Attendees" : "Show Attendees"}
              </button>
            </div>

            <div className="attendee-list" id={attendeeListId} hidden={!showAttendees}>
              {showAttendees && (
                <>
                  {(attendees.loading || attendees.invalidated) && <p role="status">Loading attendees...</p>}
                  {!attendees.invalidated && (attendees.error || attendees.data?.partial) && (
                    <>
                      <p className="doin-field-error" role="alert">
                        {attendees.error || "Some attendee profiles could not be loaded."}
                      </p>
                      <button type="button" className="doin-button doin-button--secondary" onClick={attendees.invalidate}>
                        Retry attendee profiles
                      </button>
                    </>
                  )}
                  {attendeeIds.length === 0 && <p>No attendees yet.</p>}
                  {attendees.data?.users.length > 0 && (
                    <ul>
                      {attendees.data.users.map((user) => (
                        <li className="attendee" key={user.id}>
                          <Avatar src={user.imageUrl} className="attendee-image" />
                          <span>{user.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </section>

          {props.canManage && (
            <section className="event-section">
              <h2>Manage event</h2>
              <div className="event-management-actions">
                <Link className="doin-button doin-button--secondary" to={{ pathname: "edit", search: props.editSearch }}>Edit Event</Link>
                <button
                  type="button"
                  className="doin-button doin-button--danger-outline"
                  onClick={(event) => openConfirmation(event, "cancel")}
                >
                  Cancel Event
                </button>
              </div>
            </section>
          )}

          <section className="event-section">
            <h2>About this event</h2>
            <p className="event-description">{event.description}</p>
          </section>

          {!action && error && <p className="doin-field-error" role="alert">{error}</p>}
          <ConfirmationDialog
            action={action && { ...action, description: action.description ?? descriptions[confirmation] }}
            pending={pending}
            disabled={actionDisabled}
            error={error || unavailable}
            onConfirm={submitAction}
            onDismiss={() => setConfirmation("")}
            fallbackFocusRef={headingRef}
          />
        </div>
      </article>
    </main>
  );
};

export default EventDetails;
