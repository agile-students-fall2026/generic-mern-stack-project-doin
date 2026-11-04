import { BrowserRouter, Routes, Route, Outlet } from "react-router";
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
import mockProfile from "./mocks/mockProfile";
import { useNavigate } from "react-router";
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

  const hobbies = selectedPerson.hobbies
    .split(" • ")
    .filter((hobby) => hobby !== "NYC");

  const person = {
    ...selectedPerson,
    hobbies,
    bio: "No bio available in the current mock data.",
    sharedInterests: hobbies.filter((hobby) =>
      mockProfile.interests.includes(hobby),
    ),
  };

  return (
    <PersonDetails
      person={person}
      requested={sentRequestIds.includes(person.id)}
      onRequest={() => onSendRequest(person.id)}
      onBack={() => setSelectedPerson(null)}
    />
  );
}

function EventsPreview({ rsvps, onUpdateRsvp, events }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const navigate = useNavigate();

  // Show Explore Events when no event is selected

  if (!selectedEvent) {
    return (
      <Explore
        events={events}
        onViewEvent={setSelectedEvent}
        onCreateEvent={() => navigate("/create-event")}
      />
    );
  }

  // Prepare the selected event for EventDetails
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

  // Display the selected event
  return (
    <EventDetails
      key={event.id}
      event={event}
      users={mockUsers.map((user) =>
        user.id === currentUser.id ? profileUser : user,
      )}
      currentUser={profileUser}
      onBack={() => setSelectedEvent(null)}
      onAttendeeChange={(ids) => onUpdateRsvp(event.id, ids)}
    />
  );
}

export default function App() {
  const [rsvps, setRsvps] = useState({});
  const [sentRequestIds, setSentRequestIds] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);
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
          <Route path="/profile" element={<Profile />} />
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
