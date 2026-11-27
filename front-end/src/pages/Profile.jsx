import { Link } from "react-router";
import { getUserById } from "../api";
import UserProfile from "../Components/UserProfile";
import useApiData from "../useApiData";

export default function Profile({ userId, refreshKey, onLogout }) {
  const { data: profile, loading, error } = useApiData(userId, getUserById, refreshKey);
  if (loading || error) {
    return (
      <main className="doin-page">
        <h1 className="doin-page-title">My profile</h1>
        {loading
          ? <p role="status">Loading your profile...</p>
          : <p role="alert">{error}</p>}
        <button type="button" className="doin-button doin-button--secondary" onClick={onLogout}>
          Logout
        </button>
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
      stats={profile.stats}
    >
      <Link to="/edit-profile" className="doin-button doin-button--primary">
        Edit profile
      </Link>
      <button type="button" className="doin-button doin-button--secondary" onClick={onLogout}>
        Logout
      </button>
    </UserProfile>
  );
}
