import { Link } from "react-router";
import mockProfile from "../mocks/mockProfile";
import UserProfile from "../Components/UserProfile";

export default function Profile({ stats = [] }) {
  return (
    <UserProfile
      title="My profile"
      name={mockProfile.name}
      username={mockProfile.username}
      location={mockProfile.location}
      bio={mockProfile.bio}
      interests={mockProfile.interests ?? []}
      imageUrl={mockProfile.imageUrl}
      stats={stats}
    >
      <Link to="/edit-profile" className="doin-button doin-button--primary">
        Edit profile
      </Link>
    </UserProfile>
  );
}
