
import { Link } from "react-router";
import "./Cards.css";

function PersonCard({ id, name, interests, image }) {
  return (
    <div className="person-card">
      <img src={image} alt={name} />

      <div className="person-info">
        <h3>{name}</h3>
        <p>{interests}</p>
        <Link to={`/people/${id}`}>View profile</Link>
      </div>
    </div>
  );
}

export default PersonCard;
