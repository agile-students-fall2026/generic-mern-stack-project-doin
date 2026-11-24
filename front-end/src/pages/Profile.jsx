import { Link } from "react-router";
import UserProfile from "../Components/UserProfile";

export default function Profile({ user, stats = [] }) {
  return (
    <UserProfile
      title="My profile"
      name={user.name}
      username={user.username}
      location={user.location}
      bio={user.bio}
      interests={user.interests ?? []}
      imageUrl={user.imageUrl}
      stats={stats}
    >
      <Link to="/edit-profile" className="doin-button doin-button--primary">
        Edit profile
      </Link>
    </UserProfile>
  );
}
