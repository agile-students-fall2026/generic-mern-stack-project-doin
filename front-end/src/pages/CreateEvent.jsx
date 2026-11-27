import { useNavigate } from "react-router";
import EventForm from "../Components/EventForm";
import { createEvent } from "../api";
import useToast from "../useToast";

export default function CreateEvent() {
  const navigate = useNavigate();
  const showSuccess = useToast();

  return (
    <EventForm
      onSave={createEvent}
      onSuccess={(event) => {
        showSuccess("Event created.");
        navigate(`/events/${encodeURIComponent(event.id)}`, { replace: true });
      }}
    />
  );
}
