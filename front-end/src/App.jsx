import {
  BrowserRouter,
  Link,
  matchPath,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SelectInterests from "./pages/SelectInterests";
import SetupProfile from "./pages/SetupProfile";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import MyEvents from "./pages/MyEvents";
import DiscoverPeople from "./DiscoverPeople";
import PersonProfile from "./pages/PersonProfile";
import Explore from "./Explore";
import EventPage from "./pages/EventPage";
import Connections from "./pages/Connections";
import Layout from "./Components/Layout";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import SessionBoundary from "./Components/SessionBoundary";
import ToastProvider from "./Components/ToastProvider";
import { getUserEvents } from "./api";
import useApiData from "./useApiData";
import useForegroundRefresh from "./useForegroundRefresh";
import useRelationships from "./useRelationships";
import { signedInPath, useSession } from "./useSession";

function loadMyEvents(userId, signal) {
  return getUserEvents(userId, undefined, signal);
}

function PageNotFound({ user }) {
  const content = (
    <main className="doin-page">
      <h1 className="doin-page-title">Page not found</h1>
      <p>This address doesn’t match a page in Doin.</p>
      <Link className="doin-button doin-button--primary" to={user ? signedInPath(user) : "/"} replace>
        {user?.profileComplete ? "Go to Discover People" : user ? "Continue setup" : "Go to Welcome"}
      </Link>
    </main>
  );

  return user?.profileComplete ? <Layout>{content}</Layout> : content;
}

function AppRoutes() {
  const auth = useSession();
  return (
    <ToastProvider key={auth.logoutVersion}>
      <SessionRoutes {...auth} />
    </ToastProvider>
  );
}

function SessionRoutes({ session, restoreSession, saveSession, updateSessionUser, clearSession }) {
  const { user } = session;
  const location = useLocation();
  const navigate = useNavigate();
  const foregroundRevision = useForegroundRefresh();
  const refreshKey = `${location.key}:${foregroundRevision}`;
  const sessionDestination = user ? signedInPath(user) : session.afterLogout ? "/" : "/login";

  const showsRelationships = [
    "/connections",
    "/connections/:personId",
    "/discover/:personId",
  ].some((path) => matchPath(path, location.pathname));
  const showsMyEvents = matchPath("/my-events", location.pathname);
  const userId = user?.profileComplete ? user.id : null;
  const relationships = useRelationships(showsRelationships ? userId : null, refreshKey, location.key);
  const myEvents = useApiData(showsMyEvents ? userId : null, loadMyEvents, refreshKey);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <SessionBoundary session={session} onRetry={restoreSession}>
            {user ? <Navigate to={sessionDestination} replace /> : <Welcome />}
          </SessionBoundary>
        }
      />

      <Route path="/login" element={<Login onUserChange={saveSession} />} />
      <Route path="/register" element={<Register onUserChange={saveSession} />} />

      <Route
        element={
          <SessionBoundary session={session} onRetry={restoreSession}>
            {user && !user.profileComplete ? (
              <Outlet />
            ) : (
              <Navigate to={user?.profileComplete ? "/profile" : sessionDestination} replace />
            )}
          </SessionBoundary>
        }
      >
        <Route
          path="/select-interests"
          element={<SelectInterests user={user} onUserChange={saveSession} />}
        />
        <Route
          path="/setup-profile"
          element={<SetupProfile user={user} onUserChange={updateSessionUser} />}
        />
      </Route>

      <Route
        element={
          <SessionBoundary session={session} onRetry={restoreSession}>
            {user?.profileComplete ? (
              <Layout>
                <Outlet />
              </Layout>
            ) : (
              <Navigate to={sessionDestination} replace />
            )}
          </SessionBoundary>
        }
      >
        <Route
          path="/profile"
          element={
            <Profile
              userId={userId}
              refreshKey={refreshKey}
              onLogout={clearSession}
            />
          }
        />
        <Route path="/edit-profile" element={<EditProfile onUserChange={updateSessionUser} />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route
          path="/my-events"
          element={
            <MyEvents
              events={myEvents.data}
              currentUser={user}
              loading={myEvents.loading}
              refreshing={myEvents.refreshing}
              error={myEvents.error}
              onChange={myEvents.invalidate}
            />
          }
        />
        <Route
          path="/discover"
          element={
            <DiscoverPeople
              refreshKey={refreshKey}
              onViewProfile={(person) => navigate(`/discover/${encodeURIComponent(person.id)}`)}
            />
          }
        />
        <Route
          path="/discover/:personId"
          element={
            <PersonProfile currentUser={user} relationships={relationships} refreshKey={refreshKey} />
          }
        />
        <Route
          path="/connections"
          element={<Connections userId={userId} relationships={relationships} refreshKey={refreshKey} />}
        />
        <Route
          path="/connections/:personId"
          element={
            <PersonProfile
              currentUser={user}
              relationships={relationships}
              refreshKey={refreshKey}
              fromConnections
            />
          }
        />
        <Route
          path="/events"
          element={<Explore refreshKey={refreshKey} />}
        />
        <Route
          path="/events/:eventId"
          element={<EventPage key={location.pathname} currentUser={user} refreshKey={refreshKey} />}
        />
        <Route
          path="/events/:eventId/edit"
          element={<EditEvent key={location.pathname} userId={userId} />}
        />
      </Route>
      <Route
        path="*"
        element={
          <SessionBoundary session={session} onRetry={restoreSession}>
            <PageNotFound user={user} />
          </SessionBoundary>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
