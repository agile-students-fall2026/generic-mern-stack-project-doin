import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router";
import { createEvent, getEvent, getEvents } from "./api";
import BackButton from "./Components/BackButton";
import Layout from "./Components/Layout";
import SessionBoundary from "./Components/SessionBoundary";
import DiscoverPeople from "./DiscoverPeople";
import Explore from "./Explore";
import mockDiscoverPeople from "./mockDiscoverPeople";
import { mockEvent } from "./mocks/events";
import mockProfile from "./mocks/mockProfile";
import { mockUsers } from "./mocks/users";
import normalizePerson from "./normalizePerson";
import Connections from "./pages/Connections";
import CreateEvent from "./pages/CreateEvent";
import EditProfile from "./pages/EditProfile";
import EventDetails from "./pages/EventDetails";
import Login from "./pages/Login";
import MyEvents from "./pages/MyEvents";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import SelectInterests from "./pages/SelectInterests";
import SetupProfile from "./pages/SetupProfile";
import Welcome from "./pages/Welcome";
import PersonDetails from "./PersonDetails";
import { signedInPath, useSession } from "./useSession";
const currentUser = mockUsers[0];

const demoEvents = [
  {
    ...mockEvent,
    id: "demo-joined",
    title: "Weekend Hiking Meetup",
    category: "Sports",
    imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
    organizerId: mockUsers[1].id,
    attendeeIds: [currentUser.id],
  },
  {
    ...mockEvent,
    id: "demo-hosting",
    title: "Board Game Night",
    category: "Gaming",
    imageUrl:
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800",
    organizerId: currentUser.id,
    attendeeIds: [],
  },
];

function DiscoverPreview({ sentRequestIds, onSendRequest }) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [person, setPerson] = useState(null);
  const [personUnavailable, setPersonUnavailable] = useState(false);
  const [myInterests, setMyInterests] = useState([]);

  // Shared interests are worked out against the signed in user from the
  // back end (#101). When nobody is signed in there are none.
  useEffect(() => {
    if (!currentUserId()) {
      return;
    }
    getMyUser()
      .then((user) => setMyInterests(user.interests ?? []))
      .catch(() => setMyInterests([]));
  }, []);

  // Person Details reads the full profile from the back end (#101),
  // using the shared profile endpoint from #98. If that request fails
  // the person from the list is shown instead, unless the back end
  // answered 404, which means the profile is gone and the page shows
  // an unavailable state instead.
  useEffect(() => {
    if (!selectedPerson) {
      setPerson(null);
      setPersonUnavailable(false);
      return;
    }
    let active = true;
    setPersonUnavailable(false);
    getPerson(selectedPerson.id)
      .then((data) => {
        if (active) {
          setPerson(data);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        if (error.status === 404) {
          setPersonUnavailable(true);
        } else {
          setPerson(selectedPerson);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedPerson]);

  if (!selectedPerson) {
    return <DiscoverPeople onViewProfile={setSelectedPerson} />;
  }

  if (personUnavailable) {
    return (
      <main className="doin-page">
        <BackButton
          onClick={() => setSelectedPerson(null)}
          ariaLabel="Back to discovery"
        />
        <h1 className="doin-page-title">Person not found</h1>
        <p>
          This profile is unavailable. Return to discovery to choose someone
          else.
        </p>
      </main>
    );
  }

  if (!person) {
    return (
      <main className="doin-page">
        <p>Loading profile...</p>
      </main>
    );
  }

  const fullPerson = normalizePerson(person, myInterests);

  return (
    <PersonDetails
      person={fullPerson}
      requested={sentRequestIds.includes(fullPerson.id)}
      onRequest={() => onSendRequest(fullPerson.id)}
      onBack={() => setSelectedPerson(null)}
    />
  );
}

function ConnectionProfile({
  sentRequestIds,
  onSendRequest,
  pendingRequests,
  connectedUsers,
  onAcceptRequest,
  onDeclineRequest,
}) {
  const { personId } = useParams();
  const navigate = useNavigate();
  const record = [
    ...pendingRequests,
    ...connectedUsers,
    ...mockUsers,
    ...mockDiscoverPeople,
  ].find((person) => String(person.id) === personId);
  const onBack = () => navigate("/connections");

  if (!record) {
    return (
      <main className="doin-page">
        <BackButton onClick={onBack} ariaLabel="Back to connections" />
        <h1 className="doin-page-title">Person not found</h1>
        <p>
          This profile is unavailable. Return to Connections to choose someone else.
        </p>
      </main>
    );
  }

  const person = normalizePerson(record, mockProfile.interests);
  const connected = connectedUsers.some((user) => user.id === person.id);
  const pending = pendingRequests.some((user) => user.id === person.id);

  return (
    <PersonDetails
      key={personId}
      person={person}
      onBack={onBack}
      backAriaLabel="Back to connections"
      requested={sentRequestIds.includes(person.id)}
      onRequest={() => onSendRequest(person.id)}
    >
      {connected ? (
        <p>You are connected.</p>
      ) : pending ? (
        <>
          <button
            type="button"
            className="doin-button doin-button--primary"
            onClick={() => onAcceptRequest(record)}
          >
            Accept
          </button>
          <button
            type="button"
            className="doin-button doin-button--secondary"
            onClick={() => onDeclineRequest(record)}
          >
            Decline
          </button>
        </>
      ) : null}
    </PersonDetails>
  );
}

function EventsPreview({
  rsvps,
  onUpdateRsvp,
  events,
  eventsLoading,
  eventsError,
}) {
  const navigate = useNavigate();
  const { eventId } = useParams();

const [eventDetails, setEventDetails] = useState(null);
const [detailsLoading, setDetailsLoading] = useState(false);
const [detailsError, setDetailsError] = useState("");

useEffect(() => {
  if (!eventId) return;

  const controller = new AbortController();

  async function loadEvent() {
    setDetailsLoading(true);
    setDetailsError("");
    setEventDetails(null);

    try {
      const event = await getEvent(eventId, controller.signal);

      if (!controller.signal.aborted) {
        setEventDetails(event);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setDetailsError(
          error.status === 404 ? "Event not found." : "Could not load event.",
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setDetailsLoading(false);
      }
    }
  }

  loadEvent();
  return () => controller.abort();
}, [eventId]);

  
  // Show the event list only when no event ID is selected.
  if (!eventId) {
    if (eventsLoading) {
      return <p role="status">Loading events...</p>;
    }

    if (eventsError) {
      return <p role="alert">{eventsError}</p>;
    }

    return (
      <Explore
        events={events}
        onViewEvent={(event) =>
          navigate(`/events/${event.id}`)
        }
        onCreateEvent={() => navigate("/create-event")}
      />
    );
  }

  // Event details must load independently of the event list.
  if (detailsLoading) {
    return <p role="status">Loading event details...</p>;
  }

  if (detailsError) {
    return (
      <main className="event-details">
        <p role="alert">{detailsError}</p>
        <button
          type="button"
          className="doin-button doin-button--secondary"
          onClick={() => navigate("/events")}
        >
          Back to events
        </button>
      </main>
    );
  }

  if (!eventDetails) {
    return <p role="status">Loading event details...</p>;
  }

  const selectedEvent = eventDetails;


  // Prepare the event for EventDetails
  const event = {
    ...selectedEvent,
    imageUrl: selectedEvent.imageUrl ?? selectedEvent.image,
    startTime: selectedEvent.startTime ?? selectedEvent.time,
    endTime: selectedEvent.endTime ?? "Not specified",
    description:
      selectedEvent.description ?? "Demo event for frontend testing.",
    organizer: "Doin",
    attendeeIds: rsvps[selectedEvent.id] ?? selectedEvent.attendeeIds ?? [],
    capacity: selectedEvent.capacity ?? 20,
  };

  const profileUser = {
    ...currentUser,
    name: mockProfile.name,
    imageUrl: mockProfile.imageUrl,
  };

  return (
    <EventDetails
      key={event.id}
      event={event}
      users={mockUsers.map((user) =>
        user.id === currentUser.id ? profileUser : user,
      )}
      currentUser={profileUser}
      onBack={() => navigate("/events")}
      onAttendeeChange={(ids) => onUpdateRsvp(event.id, ids)}
    />
  );
}

export default function App() {
  const { session, restoreSession, saveSession } = useSession();
  const { user } = session;
  const sessionDestination = user ? signedInPath(user) : "/login";
  const [rsvps, setRsvps] = useState({});
  const [sentRequestIds, setSentRequestIds] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [apiEvents, setApiEvents] = useState([]);
const [eventsLoading, setEventsLoading] = useState(true);
const [eventsError, setEventsError] = useState("");

useEffect(() => {
  const controller = new AbortController();

  async function loadEvents() {
    try {
      const events = await getEvents(controller.signal);

      if (!controller.signal.aborted) {
        setApiEvents(events);
        setEventsError("");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setEventsError("Could not load events.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setEventsLoading(false);
      }
    }
  }

  loadEvents();
  return () => controller.abort();
}, []);
  const [pendingRequests, setPendingRequests] = useState(() =>
    mockUsers.slice(0, 3),
  );
  const [connectedUsers, setConnectedUsers] = useState(() =>
    mockUsers.slice(3, 9),
  );
 const exploreEvents = apiEvents.map((event) => ({
  ...event,
  image: event.imageUrl,
  time: event.startTime,
}));

  function handleRsvpChange(eventId, attendeeIds) {
    setRsvps((previous) => ({
      ...previous,
      [eventId]: attendeeIds,
    }));
  }

  const myEventsData = [
    ...demoEvents,
    ...exploreEvents.map((event) => ({
      ...event,
      imageUrl: event.imageUrl ?? event.image,
      startTime: event.startTime ?? event.time,
      organizerId: event.organizerId ?? null,
      attendeeIds: rsvps[event.id] ?? event.attendeeIds ?? [],
    })),
  ];

  const profileStats = [
    {
      label: "Connections",
      value: connectedUsers.length,
    },
    {
      label: "Hosted",
      value: myEventsData.filter(
        (event) => event.organizerId === currentUser.id,
      ).length,
    },
    {
      label: "Attended",
      value: myEventsData.filter((event) =>
        (event.attendeeIds ?? []).includes(currentUser.id),
      ).length,
    },
  ];

  function handleSendRequest(personId) {
    setSentRequestIds((previous) =>
      previous.includes(personId)
        ? previous.filter((id) => id !== personId)
        : [...previous, personId],
    );
  }

  
  async function handleCreateEvent(fields) {
    const createdEvent = await createEvent(fields);

    // Reload events from Express after successful creation.
    try {
      const updatedEvents = await getEvents();
      setApiEvents(updatedEvents);
      setEventsError("");
    } catch {
      setEventsError("Could not refresh events.");
    }

    return createdEvent;
  }

  function handleAcceptRequest(user) {
    setPendingRequests((previous) =>
      previous.filter((person) => person.id !== user.id),
    );

    setConnectedUsers((previous) =>
      previous.some((person) => person.id === user.id)
        ? previous
        : [...previous, user],
    );
  }

  function handleDeclineRequest(user) {
    setPendingRequests((previous) =>
      previous.filter((person) => person.id !== user.id),
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Pages without the navigation bar */}
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
                <Navigate to={sessionDestination} replace />
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
            element={<SetupProfile onUserChange={saveSession} />}
          />
        </Route>

        {/* Main app pages with the navigation bar */}
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
          <Route path="/profile" element={<Profile stats={profileStats} />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route
            path="/create-event"
            element={<CreateEvent onCreate={handleCreateEvent} />}
          />

          <Route
            path="/my-events"
            element={
              <MyEvents events={myEventsData} currentUser={currentUser} />
            }
          />

          <Route
            path="/discover"
            element={
              <DiscoverPreview
                sentRequestIds={sentRequestIds}
                onSendRequest={handleSendRequest}
              />
            }
          />

          <Route
            path="/connections"
            element={
              <Connections
                sentRequestIds={sentRequestIds}
                onSendRequest={handleSendRequest}
                pendingRequests={pendingRequests}
                connectedUsers={connectedUsers}
                onAcceptRequest={handleAcceptRequest}
                onDeclineRequest={handleDeclineRequest}
              />
            }
          />

          <Route
            path="/connections/:personId"
            element={
              <ConnectionProfile
                sentRequestIds={sentRequestIds}
                onSendRequest={handleSendRequest}
                pendingRequests={pendingRequests}
                connectedUsers={connectedUsers}
                onAcceptRequest={handleAcceptRequest}
                onDeclineRequest={handleDeclineRequest}
              />
            }
          />

          <Route
  path="/events"
  element={
    <EventsPreview
      events={exploreEvents}
      rsvps={rsvps}
      onUpdateRsvp={handleRsvpChange}
      eventsLoading={eventsLoading}
      eventsError={eventsError}
    />
  }
/>

          <Route
  path="/events/:eventId"
  element={
    <EventsPreview
      events={exploreEvents}
      rsvps={rsvps}
      onUpdateRsvp={handleRsvpChange}
      eventsLoading={eventsLoading}
      eventsError={eventsError}
    />
  }
/>
            
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
