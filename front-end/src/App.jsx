import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useNavigate,
  useParams,
} from "react-router";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SelectInterests from "./pages/SelectInterests";
import SetupProfile from "./pages/SetupProfile";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import MyEvents from "./pages/MyEvents";
import { mockEvent } from "./mocks/events";
import mockEvents from "./mockEvents";
import { mockUsers } from "./mocks/users";
import { useState } from "react";
import DiscoverPeople from "./DiscoverPeople";
import PersonDetails from "./PersonDetails";
import BackButton from "./Components/BackButton";
import mockDiscoverPeople from "./mockDiscoverPeople";
import normalizePerson from "./normalizePerson";
import mockProfile from "./mocks/mockProfile";
import Explore from "./Explore";
import EventDetails from "./pages/EventDetails";
import Connections from "./pages/Connections";
import Layout from "./Components/Layout";
import CreateEvent from "./pages/CreateEvent";

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

  if (!selectedPerson) {
    return <DiscoverPeople onViewProfile={setSelectedPerson} />;
  }

  const person = normalizePerson(selectedPerson, mockProfile.interests);

  return (
    <PersonDetails
      person={person}
      requested={sentRequestIds.includes(person.id)}
      onRequest={() => onSendRequest(person.id)}
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

function EventsPreview({ rsvps, onUpdateRsvp, events }) {
  const navigate = useNavigate();
  const { eventId } = useParams();

  // No event ID: display the discovery page
  if (!eventId) {
    return (
      <Explore
        events={events}
        onViewEvent={(event) => navigate(`/events/${event.id}`)}
        onCreateEvent={() => navigate("/create-event")}
      />
    );
  }

  // Find the event matching the ID in the URL
  const selectedEvent = events.find((event) => String(event.id) === eventId);

  if (!selectedEvent) {
    return (
      <main className="event-details">
        <p>Event not found.</p>
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
  const [rsvps, setRsvps] = useState({});
  const [sentRequestIds, setSentRequestIds] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(() =>
    mockUsers.slice(0, 3),
  );
  const [connectedUsers, setConnectedUsers] = useState(() =>
    mockUsers.slice(3, 9),
  );
  const exploreEvents = [
    ...mockEvents,
    ...createdEvents.map((event) => ({
      ...event,
      image: event.imageUrl,
      time: event.startTime,
    })),
  ];

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

  function handleCreateEvent(newEvent) {
    setCreatedEvents((previous) => [
      ...previous,
      {
        ...newEvent,
        organizerId: currentUser.id,
      },
    ]);
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
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/select-interests" element={<SelectInterests />} />
        <Route path="/setup-profile" element={<SetupProfile />} />

        {/* Main app pages with the navigation bar */}
        <Route
          element={
            <Layout>
              <Outlet />
            </Layout>
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
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
