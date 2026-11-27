import { useId } from "react";
import { Link } from "react-router";
import { formatEventDate, formatEventTimeRange, formatEventTimeZone } from "../eventFormat";
import EventArtwork from "./EventArtwork";
import LocationIcon from "./LocationIcon";
import "./EventCard.css";

export default function EventCard({ event, className, from, children }) {
  const titleId = useId();
  const date = formatEventDate(event.date);
  const time = formatEventTimeRange(event.startTime ?? event.time, event.endTime);
  const zone = time && formatEventTimeZone(event.timezone);
  const attendeeCount = Array.isArray(event.attendeeIds) ? event.attendeeIds.filter((id) => id !== event.organizerId).length : null;

  return (
    <article className={className ? `doin-card event-card ${className}` : "doin-card event-card"}>
      <Link className="event-card-link" to={`/events/${encodeURIComponent(event.id)}${from ? `?from=${from}` : ""}`} aria-labelledby={titleId}>
        <EventArtwork className="event-card-artwork" src={event.imageUrl ?? event.image} />
        <div className="event-card-content">
          <h2 id={titleId}>{event.title}</h2>
          {event.category && <span className="event-card-category">{event.category}</span>}
          {(date || time) && (
            <p className="event-card-schedule">
              {date && <time dateTime={event.date}>{date}</time>}
              {time && <span>{time}{zone && ` ${zone}`}</span>}
            </p>
          )}
          {event.location && (
            <p className="event-card-location">
              <LocationIcon />
              <span>{event.location}</span>
            </p>
          )}
          {attendeeCount !== null && (
            <p className="event-card-attendance">
              {attendeeCount}{Number.isInteger(event.capacity) && ` of ${event.capacity}`} attending
            </p>
          )}
        </div>
        <svg className="event-card-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Link>
      {children && <footer className="event-card-actions">{children}</footer>}
    </article>
  );
}
