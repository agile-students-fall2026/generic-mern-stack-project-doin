import { Link } from "react-router";
import { useOrigin } from "../viewHistory";
import Avatar from "./Avatar";
import Icon from "./Icon";

export default function PersonCard({ person }) {
  const origin = useOrigin();

  return (
    <Link className="person-card" to={`/discover/${encodeURIComponent(person.id)}`}
      state={origin} aria-label={`View ${person.name}'s profile`}>
      <Avatar src={person.imageUrl} />
      <span className="person-info">
        <h2>{person.name}</h2>
        {person.interests?.length > 0 && <small>{person.interests.join(" · ")}</small>}
      </span>
      <Icon name="next" />
    </Link>
  );
}
