import { Link } from "react-router";
import mockProfile from "../mocks/mockProfile";
import "./Profile.css";

// My Profile page (#45): shows the user's own profile information.
export default function Profile() {
  const details = [mockProfile.location, ...(mockProfile.interests ?? [])]
    .filter(Boolean)
    .join(" • ");
  return (
    <main className="profile-page">
      <div className="doin-card profile-card">
        <h1 className="profile-heading">My profile</h1>

        <img
          className="profile-photo"
          src={mockProfile.imageUrl}
          alt={mockProfile.name}
        />

        <h2 className="profile-name">{mockProfile.name}</h2>

        {mockProfile.username && (
          <p className="profile-username">@{mockProfile.username}</p>
        )}

        {details && <p className="profile-details">{details}</p>}

        <div className="profile-actions">
          <Link to="/edit-profile" className="doin-button doin-button--primary">
            Edit profile
          </Link>
          <Link to="/my-events" className="doin-button doin-button--secondary">
            My events
          </Link>
          <button className="doin-button doin-button--secondary">
            Settings
          </button>
        </div>

        <h2 className="profile-section-title">
          Your connections and hosted events
        </h2>
        <p className="profile-empty">Nothing here yet.</p>
      </div>
    </main>
  );
}
