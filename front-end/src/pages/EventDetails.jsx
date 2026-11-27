import { useId, useRef, useState } from "react";
import { Link } from "react-router";
import Avatar from "../Components/Avatar";
import BackButton from "../Components/BackButton";
import ConfirmationDialog from "../Components/ConfirmationDialog";
import EventArtwork from "../Components/EventArtwork";
import Icon from "../Components/Icon";
import "../styles/EventDetails.css";
import { getUserById, joinEvent, leaveEvent } from "../api";
import { formatEventDate, formatEventTimeRange, formatEventTimeZone } from "../eventFormat";
import useApiData from "../useApiData";
import useSubmission from "../useSubmission";
import useToast from "../useToast";
import { cancelEventAction } from "../eventActions";
import { eventProfilePath, useOrigin, useViewState } from "../viewHistory";

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
  const time = formatEventTimeRange(event.startTime, event.endTime, { compact: true });
  const zone = formatEventTimeZone(event.timezone, { long: true });

  const items = [
    ["date", "Date", date],
    ["pin", "Location", event.location],
    ["time", "Time", time],
    ["timezone", "Time zone", zone],
  ];
  return (
    <dl className="event-info" aria-label="Schedule and location">
      {items.map(([icon, label, value]) => value && (
        <div key={label}>
          <dt><Icon name={icon} />{label}</dt>
          <dd className={icon === "pin" ? "event-location" : undefined}>{icon === "date" ? <time dateTime={event.date}>{value}</time> : value}</dd>
        </div>
      ))}
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
  const [{ showAttendees }, updateView] = useViewState({ showAttendees: false });
  const origin = useOrigin();
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
  const spots = `${remaining} guest ${remaining === 1 ? "spot" : "spots"} left`;
  const action = confirmation === "cancel" ? cancelEventAction(event.title) : eventActions[confirmation];
  const date = formatEventDate(event.date);
  const descriptions = {
    join: `Join ${event.title} at ${event.location}${date ? ` on ${date}` : ""}?`,
    leave: "Your RSVP will be removed and your spot will become available.",
  };
  const unavailable = action && unavailableReason(confirmation, { cancelled, isAttending, isFull, canManage: props.canManage });
  const actionDisabled = !currentUser || Boolean(unavailable);
  const organizerIdentity = (
    <>
      <Avatar src={event.organizerImage} className="event-organizer-avatar" />
      <span>Organized by {event.organizer}</span>
    </>
  );

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
    <main className="event-details doin-page doin-page--app">
      <BackButton onClick={onBack} ariaLabel={`Back to ${props.backLabel}`} label={props.backLabel} />

      <article className={`event-details-card${event.title.length > 60 ? " event-details-long" : ""}`}>
        <EventArtwork className="event-details-image" src={event.imageUrl} />

        <div className="event-details-content">
          <header className="event-details-header">
            <div className="event-detail-title">
              <h1 className="doin-page-title" ref={headingRef} tabIndex={-1}>{event.title}</h1>
              <span className="event-card-category">{event.category}</span>
            </div>
            <div className="event-organizer">
              {isHost ? (
                <div className="event-organizer-identity">{organizerIdentity}</div>
              ) : (
                <Link to={eventProfilePath(event.organizerId, event.id, props.editSearch)}
                  state={origin} className="event-organizer-identity event-organizer-link">
                  {organizerIdentity}
                </Link>
              )}
              {isHost && <span className="event-hosted-state">Hosted by you</span>}
            </div>
          </header>

          {cancelled && <p role="status" className="event-cancelled">This event was canceled.</p>}
          <EventInformation event={event} />

          <section className="event-section event-attendance">
            <h2>Who's going?</h2>
            <div className="attendee-summary">
              <p className="attendee-count">{attendeeIds.length}/{event.capacity} attending</p>
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

            </div>
            <button
              type="button"
              className="attendee-toggle"
              onClick={() => updateView({ showAttendees: !showAttendees })}
              aria-expanded={showAttendees}
              aria-label={showAttendees ? "Hide Attendees" : "Show Attendees"}
              aria-controls={attendeeListId}
            >
              <Icon name="down" /> Attendees <span>({attendeeIds.length})</span>
            </button>
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
                          {user.id === currentUser.id ? (
                            <div className="attendee-row attendee-self">
                              <Avatar src={user.imageUrl} className="attendee-image" />
                              <strong>{user.name}</strong>
                              <span className="attendee-you">You</span>
                            </div>
                          ) : (
                            <Link className="attendee-row" state={origin}
                              to={eventProfilePath(user.id, event.id, props.editSearch)}
                              aria-label={`View ${user.name}'s profile`}>
                              <Avatar src={user.imageUrl} className="attendee-image" />
                              <strong>{user.name}</strong>
                              <Icon name="next" />
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </section>

          {props.canManage && (
            <section className="event-section event-section--plain">
              <h2>Manage event</h2>
              <div className="event-management-actions">
                <Link className="doin-button doin-button--secondary" to={{ pathname: "edit", search: props.editSearch }} state={origin}><Icon name="edit" /> Edit Event</Link>
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

          <section className="event-section event-section--plain">
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
