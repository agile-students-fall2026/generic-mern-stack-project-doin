import { useEffect, useState } from "react";
import { Link } from "react-router";
import UserProfile from "../Components/UserProfile";
import { currentUserId, getPerson } from "../api";

export default function Profile({ stats = [] }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  // My Profile reads the signed in user from the back end (#101), using
  // the shared profile endpoint from #98.
  useEffect(() => {
    const userId = currentUserId();
    if (!userId) {
      setError("Please log in to see your profile.");
      return;
    }
    getPerson(userId)
      .then((data) => setProfile(data))
      .catch(() => setError("Your profile could not be loaded. Please try again."));
  }, []);

  if (error) {
    return (
      <main className="doin-page">
        <h1 className="doin-page-title">My profile</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="doin-page">
        <p>Loading your profile...</p>
      </main>
    );
  }

  return (
    <UserProfile
      title="My profile"
      name={profile.name}
      username={profile.username}
      location={profile.location}
      bio={profile.bio}
      interests={profile.interests ?? []}
      imageUrl={profile.imageUrl}
      stats={stats}
    >
      <Link to="/edit-profile" className="doin-button doin-button--primary">
        Edit profile
      </Link>
    </UserProfile>
  );
}
