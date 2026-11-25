
import { useState, useEffect } from "react";
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
import DiscoverPeople from "./DiscoverPeople";
import PersonDetails from "./PersonDetails";
import BackButton from "./Components/BackButton";
import normalizePerson from "./normalizePerson";
import Explore from "./Explore";
import EventDetails from "./pages/EventDetails";
import Connections from "./pages/Connections";
import Layout from "./Components/Layout";
import CreateEvent from "./pages/CreateEvent";
import SessionBoundary from "./Components/SessionBoundary";
import { signedInPath, useSession } from "./useSession";

import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  cancelEvent,
  getUserEvents,
  getConnections,
  getConnectionRequests,
  getUserById,
  updateConnectionRequest,
  sendConnectionRequest,
  getUsers,
} from "./api";

function DiscoverPreview({
  currentUser,
  outgoingRequests,
  onSendRequest,
  onCancelRequest,
}) {
  const [selectedPerson, setSelectedPerson] = useState(null);

  if (!selectedPerson) {
    return (
      <DiscoverPeople onViewProfile={setSelectedPerson} />
    );
  }

  const person = normalizePerson(
    selectedPerson,
    currentUser?.interests ?? [],
  );

  const existingRequest = outgoingRequests.find(
    (request) => request.recipientId === person.id,
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
    currentUser?.interests ?? [],
  );

  const connected = connectedUsers.some(
    (user) => user.id === person.id,
  );

  const incomingRequest = incomingRequests.find(
    (request) => request.senderId === person.id,
  );

  const outgoingRequest = outgoingRequests.find(
    (request) => request.recipientId === person.id,
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

function EventsPreview({
  events,
  currentUser,
  eventsLoading,
  eventsError,
  onUpdateRsvp,
  onEventChanged,
}) {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [eventDetails, setEventDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [managementError, setManagementError] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [attendeeUsers, setAttendeeUsers] = useState([]);

  // Load event details directly from Express.
  useEffect(() => {
    if (!eventId) return;

    const controller = new AbortController();

    setEventDetails(null);
    setDetailsLoading(true);
    setDetailsError("");
    setManagementError("");

    getEvent(eventId, controller.signal)
      .then((event) => {
        if (!controller.signal.aborted) {
          setEventDetails(event);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setDetailsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDetailsLoading(false);
        }
      });

    return () => controller.abort();
  }, [eventId]);

  // Retrieve the organizer's profile.
  useEffect(() => {
    const controller = new AbortController();

    setOrganizerName("");

    if (eventDetails?.organizerId) {
      getUserById(
        eventDetails.organizerId,
        controller.signal,
      )
        .then((person) => {
          if (!controller.signal.aborted) {
            setOrganizerName(person.name);
          }
        })
        .catch(() => {});
    }

    return () => controller.abort();
  }, [eventDetails?.organizerId]);

  // Retrieve real attendee profiles from Express.
  useEffect(() => {
    const controller = new AbortController();

    setAttendeeUsers([]);

    Promise.allSettled(
      (eventDetails?.attendeeIds ?? []).map((id) =>
        getUserById(id, controller.signal),
      ),
    ).then((results) => {
      if (!controller.signal.aborted) {
        setAttendeeUsers(
          results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value),
        );
      }
    });

    return () => controller.abort();
  }, [eventDetails?.attendeeIds]);

  // Display Explore Events.
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

  if (!eventDetails || String(eventDetails.id) !== eventId) {
    return <p role="status">Loading event details...</p>;
  }

  const event = {
    ...eventDetails,
    organizer:
      organizerName ||
      eventDetails.organizerName ||
      eventDetails.organizerId ||
      "Unknown organizer",
  };

  const canManage =
    Boolean(currentUser?.id) &&
    event.organizerId === currentUser.id &&
    event.status !== "cancelled";

  // Edit the event through Express.
  async function handleEditEvent() {
    const title = window.prompt("Event name:", event.title);
    if (title === null) return;

    const description = window.prompt(
      "Description:",
      event.description,
    );
    if (description === null) return;

    const location = window.prompt(
      "Location:",
      event.location,
    );
    if (location === null) return;

    try {
      setManagementError("");

      const updated = await updateEvent(event.id, {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
      });

      setEventDetails(updated);
      onEventChanged(updated, false);
    } catch (error) {
      setManagementError(error.message);
    }
  }

  // Cancel the event through Express.
  async function handleCancelEvent() {
    try {
      setManagementError("");

      const cancelled = await cancelEvent(event.id);

      onEventChanged(cancelled, true);
      navigate("/events");
    } catch (error) {
      setManagementError(error.message);
    }
  }

  return (
    <EventDetails
      key={event.id}
      event={event}
      users={attendeeUsers}
      currentUser={currentUser}
      canManage={canManage}
      onEdit={handleEditEvent}
      onCancel={handleCancelEvent}
      managementError={managementError}
      onBack={() => navigate("/events")}
      onAttendeeChange={(ids) => {
        setEventDetails((previous) => ({
          ...previous,
          attendeeIds: ids,
        }));

        onUpdateRsvp(event.id, ids);
      }}
    />
  );
}

export default function App() {
  const { session, restoreSession, saveSession } = useSession();
  const { user } = session;

  const sessionDestination = user
    ? signedInPath(user)
    : "/login";

  const [serverEvents, setServerEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [myEvents, setMyEvents] = useState([]);
  const [myEventsLoading, setMyEventsLoading] = useState(false);
  const [myEventsError, setMyEventsError] = useState("");

  const [rsvps, setRsvps] = useState({});
  const [eventsRevision, setEventsRevision] = useState(0);

  const [connectedUsers, setConnectedUsers] = useState([]);
  const [connectionsLoading, setConnectionsLoading] =
    useState(false);
  const [connectionsError, setConnectionsError] = useState("");

  const [serverConnectionRequests, setServerConnectionRequests] =
    useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [requestUsers, setRequestUsers] = useState({});
  const [updatingRequestId, setUpdatingRequestId] =
    useState(null);

  const [availableUsers, setAvailableUsers] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] =
    useState(false);
  const [suggestionsError, setSuggestionsError] = useState("");

  // Load events.
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

  // Load My Events after RSVP or event management changes.
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
  }, [user?.id, rsvps, eventsRevision]);

  // Load accepted connections.
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

  // Load available users for connection suggestions.
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

  // Load connection requests.
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

  // Retrieve profiles involved in connection requests.
  useEffect(() => {
    if (!user?.id || serverConnectionRequests.length === 0) {
      setRequestUsers({});
      return;
    }

    const controller = new AbortController();

    const userIds = [
      ...new Set(
        serverConnectionRequests.map((request) =>
          request.senderId === user.id
            ? request.recipientId
            : request.senderId,
        ),
      ),
    ];

    Promise.all(
      userIds.map((id) =>
        getUserById(id, controller.signal),
      ),
    )
      .then((users) => {
        if (!controller.signal.aborted) {
          setRequestUsers(
            Object.fromEntries(
              users.map((person) => [person.id, person]),
            ),
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
    (request) =>
      request.recipientId === user?.id &&
      request.status === "pending",
  );

  const outgoingRequests = serverConnectionRequests.filter(
    (request) =>
      request.senderId === user?.id &&
      request.status === "pending",
  );

  const suggestedUsers = availableUsers
    .filter(
      (person) =>
        person.id !== user?.id &&
        !connectedUsers.some(
          (connected) => connected.id === person.id,
        ) &&
        !incomingRequests.some(
          (request) => request.senderId === person.id,
        ),
    )
    .slice(0, 3);

  const sentRequestIds = outgoingRequests.map(
    (request) => request.recipientId,
  );

  const exploreEvents = serverEvents.map((event) => ({
    ...event,
    image: event.imageUrl,
    time: event.startTime,
  }));

  // Update event participation after a successful API request.
  function handleRsvpChange(eventId, attendeeIds) {
    setRsvps((previous) => ({
      ...previous,
      [eventId]: attendeeIds,
    }));

    setServerEvents((previous) =>
      previous.map((event) =>
        event.id === eventId
          ? { ...event, attendeeIds }
          : event,
      ),
    );
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
        (event) => event.organizerId === user?.id,
      ).length,
    },
    {
      label: "Attended",
      value: myEventsData.filter((event) =>
        (event.attendeeIds ?? []).includes(user?.id),
      ).length,
    },
  ];

  // Update the event list after creation, editing, or cancellation.
  function handleEventChanged(changed, cancelled = false) {
    setServerEvents((previous) =>
      cancelled
        ? previous.filter((event) => event.id !== changed.id)
        : previous.some((event) => event.id === changed.id)
          ? previous.map((event) =>
              event.id === changed.id ? changed : event,
            )
          : [...previous, changed],
    );

    setEventsRevision((previous) => previous + 1);
  }

  async function handleCreateEvent(fields) {
    const created = await createEvent(fields);

    handleEventChanged(created);

    return created;
  }

  // Send a connection request.
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

  // Accept a connection request.
  async function handleAcceptRequest(person) {
    if (!user?.id || !person.requestId || updatingRequestId) {
      return;
    }

    setUpdatingRequestId(person.requestId);
    setRequestsError("");

    try {
      await updateConnectionRequest(person.requestId, "accepted");

      setServerConnectionRequests((previous) =>
        previous.filter(
          (request) => request.id !== person.requestId,
        ),
      );

      const connections = await getConnections(user.id);
      setConnectedUsers(connections);
    } catch (error) {
      setRequestsError(error.message);
    } finally {
      setUpdatingRequestId(null);
    }
  }

  // Decline a connection request.
  async function handleDeclineRequest(person) {
    if (!person.requestId || updatingRequestId) return;

    setUpdatingRequestId(person.requestId);
    setRequestsError("");

    try {
      await updateConnectionRequest(person.requestId, "declined");

      setServerConnectionRequests((previous) =>
        previous.filter(
          (request) => request.id !== person.requestId,
        ),
      );
    } catch (error) {
      setRequestsError(error.message);
    } finally {
      setUpdatingRequestId(null);
    }
  }

  // Cancel an outgoing connection request.
  async function handleCancelRequest(person) {
    if (!person.requestId || updatingRequestId) return;

    setUpdatingRequestId(person.requestId);
    setRequestsError("");

    try {
      await updateConnectionRequest(person.requestId, "cancelled");

      setServerConnectionRequests((previous) =>
        previous.filter(
          (request) => request.id !== person.requestId,
        ),
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
            <SessionBoundary
              session={session}
              onRetry={restoreSession}
            >
              {user ? (
                <Navigate to={sessionDestination} replace />
              ) : (
                <Welcome />
              )}
            </SessionBoundary>
          }
        />

        <Route
          path="/login"
          element={<Login onUserChange={saveSession} />}
        />

        <Route
          path="/register"
          element={<Register onUserChange={saveSession} />}
        />

        <Route
          element={
            <SessionBoundary
              session={session}
              onRetry={restoreSession}
            >
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
            element={
              <SelectInterests
                user={user}
                onUserChange={saveSession}
              />
            }
          />

          <Route
            path="/setup-profile"
            element={
              <SetupProfile onUserChange={saveSession} />
            }
          />
        </Route>

        {/* Main app pages with the navigation bar */}
        <Route
          element={
            <SessionBoundary
              session={session}
              onRetry={restoreSession}
            >
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
            element={<Profile stats={profileStats} />}
          />

          <Route
            path="/edit-profile"
            element={<EditProfile />}
          />

          <Route
            path="/create-event"
            element={
              <CreateEvent onCreate={handleCreateEvent} />
            }
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
                connectedUsers={connectedUsers}
                onAcceptRequest={handleAcceptRequest}
                onDeclineRequest={handleDeclineRequest}
                incomingRequests={incomingRequests}
                outgoingRequests={outgoingRequests}
                requestUsers={requestUsers}
                onCancelRequest={handleCancelRequest}
                updatingRequestId={updatingRequestId}
                loading={
                  connectionsLoading ||
                  requestsLoading ||
                  suggestionsLoading
                }
                error={
                  connectionsError ||
                  requestsError ||
                  suggestionsError
                }
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
                onUpdateRsvp={handleRsvpChange}
                currentUser={user}
                eventsLoading={eventsLoading}
                eventsError={eventsError}
                onEventChanged={handleEventChanged}
              />
            }
          />

          <Route
            path="/events/:eventId"
            element={
              <EventsPreview
                events={exploreEvents}
                onUpdateRsvp={handleRsvpChange}
                currentUser={user}
                eventsLoading={eventsLoading}
                eventsError={eventsError}
                onEventChanged={handleEventChanged}
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
