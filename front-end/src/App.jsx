  import {
    BrowserRouter,
    Navigate,
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
  import { useState,useEffect } from "react";
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
  import SessionBoundary from "./Components/SessionBoundary";
  import { signedInPath, useSession } from "./useSession";
  import { getEvents, 
    getUserEvents, 
    getConnections,
    getConnectionRequests,
    getUserById,
    updateConnectionRequest,
    sendConnectionRequest,
    getUsers } 
    from "./api";

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

  
function DiscoverPreview({
  people,
  currentUser,
  outgoingRequests,
  onSendRequest,
  onCancelRequest,
}) {
  const [selectedPerson, setSelectedPerson] = useState(null);

  if (!selectedPerson) {
    return (
      <DiscoverPeople
        people={people}
        onViewProfile={setSelectedPerson}
      />
    );
  }

  const person = normalizePerson(
    selectedPerson,
    currentUser?.interests ?? []
  );

  const existingRequest = outgoingRequests.find(
    (request) => request.recipientId === person.id
  );

  function handleRequest() {
    if (existingRequest) {
      onCancelRequest({ requestId: existingRequest.id });
    } else {
      onSendRequest(person.id);
    }
  }

  return (
    <PersonDetails
      person={person}
      requested={Boolean(existingRequest)}
      onRequest={handleRequest}
      onBack={() => setSelectedPerson(null)}
    />
  );
}


  
function ConnectionProfile({
  currentUser,
  availableUsers,
  requestUsers,
  incomingRequests,
  outgoingRequests,
  connectedUsers,
  onSendRequest,
  onCancelRequest,
  onAcceptRequest,
  onDeclineRequest,
  updatingRequestId,
}) {
  const { personId } = useParams();
  const navigate = useNavigate();
  const onBack = () => navigate("/connections");

  // Find the person using real backend profiles
  const record = [
    ...availableUsers,
    ...connectedUsers,
    ...Object.values(requestUsers),
  ].find((person) => String(person.id) === personId);

  if (!record) {
    return (
      <main className="doin-page">
        <BackButton
          onClick={onBack}
          ariaLabel="Back to connections"
        />
        <h1 className="doin-page-title">Person not found</h1>
        <p>This profile is unavailable.</p>
      </main>
    );
  }

  const person = normalizePerson(
    record,
    currentUser?.interests ?? []
  );

  const connected = connectedUsers.some(
    (user) => user.id === person.id
  );

  const incomingRequest = incomingRequests.find(
    (request) => request.senderId === person.id
  );

  const outgoingRequest = outgoingRequests.find(
    (request) => request.recipientId === person.id
  );

  function handleRequest() {
    if (updatingRequestId !== null) return;

    if (outgoingRequest) {
      onCancelRequest({ requestId: outgoingRequest.id });
    } else {
      onSendRequest(person.id);
    }
  }

  return (
    <PersonDetails
      key={personId}
      person={person}
      onBack={onBack}
      backAriaLabel="Back to connections"
      requested={Boolean(outgoingRequest)}
      onRequest={handleRequest}
    >
      {connected ? (
        <p>You are connected.</p>
      ) : incomingRequest ? (
        <>
          <button
            type="button"
            className="doin-button doin-button--primary"
            disabled={updatingRequestId !== null}
            onClick={() =>
              onAcceptRequest({
                requestId: incomingRequest.id,
              })
            }
          >
            Accept
          </button>

          <button
            type="button"
            className="doin-button doin-button--secondary"
            disabled={updatingRequestId !== null}
            onClick={() =>
              onDeclineRequest({
                requestId: incomingRequest.id,
              })
            }
          >
            Decline
          </button>
        </>
      ) : null}
    </PersonDetails>
  );
}


  function EventsPreview({ rsvps, onUpdateRsvp, events, currentUser }) {
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

    const profileUser = currentUser;

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
    const [serverEvents, setServerEvents] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [myEventsLoading, setMyEventsLoading] = useState(false);
    const [myEventsError, setMyEventsError] = useState("");
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsError, setEventsError] = useState("");
    const { user } = session;
    const sessionDestination = user ? signedInPath(user) : "/login";
    const [rsvps, setRsvps] = useState({});
    const [createdEvents, setCreatedEvents] = useState([]);
    const [pendingRequests, setPendingRequests] = useState(() =>
      mockUsers.slice(0, 3),
    );
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [connectionsLoading, setConnectionsLoading] = useState(false);
    const [connectionsError, setConnectionsError] = useState("");


    const [serverConnectionRequests, setServerConnectionRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState("");

    const [requestUsers, setRequestUsers] = useState({});

    const [updatingRequestId, setUpdatingRequestId] = useState(null);

    const [availableUsers, setAvailableUsers] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState("");

    useEffect(() => {
      if (!user?.id) {
        setServerEvents([]);
        setEventsLoading(false);
        return;
      }

      const controller = new AbortController();

      setEventsLoading(true);
      setEventsError("");

      getEvents(controller.signal)
        .then((events) => {
          setServerEvents(events);
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            setEventsError(error.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setEventsLoading(false);
          }
        });

      return () => controller.abort();
    }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setMyEvents([]);
      setMyEventsLoading(false);
      return;
    }

    const controller = new AbortController();

    setMyEventsLoading(true);
    setMyEventsError("");

    getUserEvents(user.id, undefined, controller.signal)
      .then((events) => {
        setMyEvents(events);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setMyEventsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setMyEventsLoading(false);
        }
      });

    return () => controller.abort();
  }, [user?.id, rsvps]);

  useEffect(() => {
    if (!user?.id) {
      setConnectedUsers([]);
      setConnectionsLoading(false);
      return;
    }

    const controller = new AbortController();

    setConnectionsLoading(true);
    setConnectionsError("");

    getConnections(user.id, controller.signal)
      .then((connections) => {
        setConnectedUsers(connections);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setConnectionsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setConnectionsLoading(false);
        }
      });

    return () => controller.abort();
  }, [user?.id]);
  

useEffect(() => {
  if (!user?.id) {
    setAvailableUsers([]);
    setSuggestionsLoading(false);
    return;
  }

  const controller = new AbortController();

  setSuggestionsLoading(true);
  setSuggestionsError("");

  getUsers(controller.signal)
    .then((users) => {
      if (!controller.signal.aborted) {
        setAvailableUsers(users);
      }
    })
    .catch((error) => {
      if (!controller.signal.aborted) {
        setSuggestionsError(error.message);
      }
    })
    .finally(() => {
      if (!controller.signal.aborted) {
        setSuggestionsLoading(false);
      }
    });

  return () => controller.abort();
}, [user?.id]);


  useEffect(() => {
    if (!user?.id) {
      setServerConnectionRequests([]);
      setRequestsLoading(false);
      return;
    }

    const controller = new AbortController();

    setRequestsLoading(true);
    setRequestsError("");

    getConnectionRequests(user.id, controller.signal)
      .then((requests) => {
        setServerConnectionRequests(requests);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setRequestsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRequestsLoading(false);
        }
      });

    return () => controller.abort();
  }, [user?.id]);


  useEffect(() => {
    if (!user?.id || serverConnectionRequests.length === 0) {
      setRequestUsers({});
      return;
    }

    const controller = new AbortController();

    // Find the other user involved in each request
    const userIds = [
      ...new Set(
        serverConnectionRequests.map((request) =>
          request.senderId === user.id
            ? request.recipientId
            : request.senderId
        )
      ),
    ];

    Promise.all(
      userIds.map((id) => getUserById(id, controller.signal))
    )
      .then((users) => {
        if (!controller.signal.aborted) {
          setRequestUsers(
            Object.fromEntries(
              users.map((person) => [person.id, person])
            )
          );
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setRequestsError(error.message);
        }
      });

    return () => controller.abort();
  }, [user?.id, serverConnectionRequests]);


  const incomingRequests = serverConnectionRequests.filter(
    (request) => request.recipientId === user?.id
  );


  const outgoingRequests = serverConnectionRequests.filter(
    (request) => request.senderId === user?.id
  );
  

const suggestedUsers = availableUsers
  .filter(
    (person) =>
      person.id !== user?.id &&
      !connectedUsers.some(
        (connected) => connected.id === person.id
      ) &&
      !incomingRequests.some(
        (request) => request.senderId === person.id
      )
  )
  .slice(0, 3);

const discoverUsers = availableUsers
  .filter((person) => person.id !== user?.id)
  .map((person) => ({
    ...person,
    image: person.imageUrl,
    hobbies: (person.interests ?? []).join(" • "),
  }));


  const sentRequestIds = outgoingRequests.map(
  (request) => request.recipientId
  );



    const exploreEvents = [
      ...serverEvents,
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

    const myEventsData = myEvents;

    const profileStats = [
      {
        label: "Connections",
        value: connectedUsers.length,
      },
      {
        label: "Hosted",
        value: myEventsData.filter(
          (event) => event.organizerId === user?.id
        ).length,
      },
      {
        label: "Attended",
        value: myEventsData.filter((event) =>
          (event.attendeeIds ?? []).includes(user?.id),
        ).length,
      },
    ];
function handleCreateEvent(newEvent) {
  setCreatedEvents((previous) => [
    ...previous,
    {
      ...newEvent,
      id: newEvent.id ?? crypto.randomUUID(),
      organizerId: user?.id,
      attendeeIds: newEvent.attendeeIds ?? [],
    },
  ]);
}
async function handleSendRequest(personId) {
  if (
    !user?.id ||
    !personId ||
    updatingRequestId ||
    sentRequestIds.includes(personId) ||
    connectedUsers.some((person) => person.id === personId)
  ) {
    return;
  }

  setUpdatingRequestId(personId);
  setRequestsError("");

  try {
    const newRequest = await sendConnectionRequest(personId);

    // Update the requests after Express confirms success
    setServerConnectionRequests((previous) => [
      ...previous,
      newRequest,
    ]);
  } catch (error) {
    setRequestsError(error.message);
  } finally {
    setUpdatingRequestId(null);
  }
}

    async function handleAcceptRequest(person) {
    if (!user?.id || !person.requestId || updatingRequestId) return;

    setUpdatingRequestId(person.requestId);
    setRequestsError("");

    try {
      await updateConnectionRequest(person.requestId, "accepted");

      // Remove the accepted request from the pending list
      setServerConnectionRequests((previous) =>
        previous.filter((request) => request.id !== person.requestId)
      );

      // Reload accepted connections from Express
      const connections = await getConnections(user.id);
      setConnectedUsers(connections);
    } catch (error) {
      setRequestsError(error.message);
    } finally {
      setUpdatingRequestId(null);
    }
  }

  async function handleDeclineRequest(person) {
    if (!person.requestId || updatingRequestId) return;

    setUpdatingRequestId(person.requestId);
    setRequestsError("");

    try {
      await updateConnectionRequest(person.requestId, "declined");

      setServerConnectionRequests((previous) =>
        previous.filter((request) => request.id !== person.requestId)
      );
    } catch (error) {
      setRequestsError(error.message);
    } finally {
      setUpdatingRequestId(null);
    }
  }

  async function handleCancelRequest(person) {
    if (!person.requestId || updatingRequestId) return;

    setUpdatingRequestId(person.requestId);
    setRequestsError("");

    try {
      await updateConnectionRequest(person.requestId, "cancelled");

      setServerConnectionRequests((previous) =>
        previous.filter((request) => request.id !== person.requestId)
      );
    } catch (error) {
      setRequestsError(error.message);
    } finally {
      setUpdatingRequestId(null);
    }
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
                <MyEvents 
                events={myEventsData} 
                currentUser={user}
                loading={myEventsLoading}
                error={myEventsError}
                      
                />
              }
            />

            <Route
              path="/discover"
              element={
                <DiscoverPreview
                  people={discoverUsers}
                  currentUser={user}
                  outgoingRequests={outgoingRequests}
                  onSendRequest={handleSendRequest}
                  onCancelRequest={handleCancelRequest}
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
                  incomingRequests={incomingRequests}
                  outgoingRequests={outgoingRequests}
                  requestUsers={requestUsers}
                  onCancelRequest={handleCancelRequest}
                  updatingRequestId={updatingRequestId}
                  loading={connectionsLoading|| requestsLoading || suggestionsLoading}
                  error={connectionsError|| requestsError || suggestionsError}  
                  suggestedUsers={suggestedUsers}
                />
              }
            />

            <Route
              path="/connections/:personId"
              element={
                <ConnectionProfile
                  currentUser={user}
                  availableUsers={availableUsers}
                  requestUsers={requestUsers}
                  incomingRequests={incomingRequests}
                  outgoingRequests={outgoingRequests}
                  connectedUsers={connectedUsers}
                  onSendRequest={handleSendRequest}
                  onCancelRequest={handleCancelRequest}
                  onAcceptRequest={handleAcceptRequest}
                  onDeclineRequest={handleDeclineRequest}
                  updatingRequestId={updatingRequestId}
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
                  currentUser={user}
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
                  currentUser={user}
                />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }
