import { Link } from "react-router";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/discover">People</Link>
      <Link to="/events">Events</Link>
      <Link to="/connections">Connect</Link>
      <Link to="/profile">Profile</Link>
    </nav>
  );
}

export default Navbar;
