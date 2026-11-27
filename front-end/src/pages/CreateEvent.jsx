import { useLocation, useNavigate } from "react-router";
import EventForm from "../Components/EventForm";
import { createEvent } from "../api";
import useToast from "../useToast";
import { useReturnTo } from "../viewHistory";

export default function CreateEvent() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const fromMyEvents = ["/my-events", "/my-events?tab=joined", "/my-events?tab=hosting"].includes(state?.origin);
  const backTo = fromMyEvents ? state.origin : "/events";
  const onCancel = useReturnTo(backTo);
  const showSuccess = useToast();

  return (
    <EventForm
      onSave={createEvent}
      onCancel={onCancel}
      backLabel={fromMyEvents ? "My Events" : "Discover Events"}
      onSuccess={(event) => {
        showSuccess("Event created.");
        const tab = fromMyEvents ? new URLSearchParams(backTo.split("?")[1]).get("tab") || "joined" : "";
        navigate(`/events/${encodeURIComponent(event.id)}${tab ? `?from=${tab}` : ""}`, {
          replace: true, state: { origin: state?.origin },
        });
      }}
    />
  );
}
