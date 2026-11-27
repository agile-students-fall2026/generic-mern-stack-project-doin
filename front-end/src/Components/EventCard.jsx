import { useId } from "react";
import { Link } from "react-router";
import { formatEventDate, formatEventTimeRange } from "../eventFormat";
import { useOrigin } from "../viewHistory";
import EventArtwork from "./EventArtwork";
import Icon from "./Icon";
import "./EventCard.css";

export default function EventCard({ event, className = "", from, joined, children }) {
  const titleId = useId();
  const origin = useOrigin();
  const date = formatEventDate(event.date);
  const time = formatEventTimeRange(event.startTime ?? event.time, event.endTime, { compact: true });
  const attendeeCount = event.attendeeIds?.filter((id) => id !== event.organizerId).length;

  return (
    <article className={`doin-card event-card ${className}`}>
      <Link className="event-card-link" to={`/events/${encodeURIComponent(event.id)}${from ? `?from=${from}` : ""}`}
        state={origin} aria-labelledby={titleId}>
        <EventArtwork className="event-card-artwork" src={event.imageUrl ?? event.image} />
        <div className="event-card-content">
          <h2 id={titleId}>{event.title}</h2>
          {(date || time) && (
            <p className="event-card-meta event-card-schedule">
              <Icon name="date" />
              <span>{date && <time dateTime={event.date}>{date}</time>}{date && time && " · "}{time && <span>{time}</span>}</span>
            </p>
          )}
          {event.location && (
            <p className="event-card-meta event-card-location">
              <Icon name="pin" /><span>{event.location}</span>
            </p>
          )}
          <div className="event-card-foot">
            {attendeeCount != null && (
              <p className="event-card-meta event-card-attendance">
                <Icon name="people" /><span>{attendeeCount}{Number.isInteger(event.capacity) && `/${event.capacity}`} attending</span>
              </p>
            )}
            {joined && <span className="event-card-joined">Joined</span>}
            {event.category && <span className="event-card-category">{event.category}</span>}
          </div>
        </div>
      </Link>
      {children && <footer className="event-card-actions">{children}</footer>}
    </article>
  );
}
