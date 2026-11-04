
import { Link } from "react-router";
import "./Cards.css";

function EventCard({ id, title, date, location, image }) {
  return (
    <div className="doin-event-card">
      <img src={image} alt={title} />

      <div className="doin-event-info">
        <h3>{title}</h3>
        <p>{date} • {location}</p>
        <Link to={`/events/${id}`}>View event</Link>
      </div>
    </div>
  );
}

export default EventCard;
