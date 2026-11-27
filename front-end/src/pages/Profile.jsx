import { Link } from "react-router";
import { getUserById } from "../api";
import Icon from "../Components/Icon";
import UserProfile from "../Components/UserProfile";
import useApiData from "../useApiData";

export default function Profile({ userId, refreshKey, onLogout }) {
  const { data: profile, loading, error, invalidate } = useApiData(userId, getUserById, refreshKey);
  if (loading || error) {
    return (
      <main className="doin-page doin-page--app">
        <h1 className="doin-page-title">My Profile</h1>
        {loading
          ? <p role="status">Loading your profile...</p>
          : <div className="browse-message">
              <p role="alert">{error}</p>
              <button type="button" className="doin-button doin-button--secondary" onClick={invalidate}>Retry profile</button>
            </div>}
        <button type="button" className="doin-button doin-button--secondary" onClick={onLogout}>
          Log Out
        </button>
      </main>
    );
  }

  return (
    <UserProfile
      title="My Profile"
      name={profile.name}
      username={profile.username}
      location={profile.location}
      bio={profile.bio}
      interests={profile.interests ?? []}
      imageUrl={profile.imageUrl}
      stats={profile.stats}
    >
      <Link to="/edit-profile" className="doin-button doin-button--primary">
        <Icon name="edit" /> Edit Profile
      </Link>
      <div className="user-profile-secondary-actions">
        <Link to="/my-events?tab=joined" className="doin-button doin-button--secondary">My Events</Link>
        <button type="button" className="doin-button doin-button--danger-outline" onClick={onLogout}>Log Out</button>
      </div>
    </UserProfile>
  );
}
