import { useEffect, useRef, useState } from "react";
import BackButton from "./BackButton";
import Icon from "./Icon";
import { formatEventDate } from "../eventFormat";
import CatalogStatus from "./CatalogStatus";
import EventArtwork from "./EventArtwork";
import TimeZoneSelect from "./TimeZoneSelect";
import { getTimeZones } from "../api";
import { profileBodyFits, profilePhotoTypes } from "../profilePhoto";
import useApiData from "../useApiData";
import useProfilePhoto from "../useProfilePhoto";
import { useEventCategoryCatalog } from "../useCatalog";
import useSubmission from "../useSubmission";
import "../styles/CreateEvent.css";

const loadTimeZones = (_, signal) => getTimeZones(signal);
const defaultImage = "/static/images/event-default.svg";
const timeOrderMessage = "End time must be after start time.";
const detectedTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

function findFieldError(fields) {
  const requiredFields = {
    title: "Enter an event name.",
    description: "Enter an event description.",
    location: "Enter an event location.",
  };
  for (const [name, message] of Object.entries(requiredFields)) {
    if (!fields[name]) return [name, message];
  }

  if (fields.endTime <= fields.startTime) {
    return ["endTime", timeOrderMessage];
  }

  if (!fields.timezone) return ["timezone", "Choose an event time zone."];

  return null;
}

function durationLabel(start, end) {
  if (!start || !end || end <= start) return "";
  const minutesOfDay = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const duration = minutesOfDay(end) - minutesOfDay(start);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return [hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(" ");
}

export default function EventForm({ event, onSave, onSuccess, onCancel, backLabel, blocked = false }) {
  const editing = Boolean(event);
  const catalog = useEventCategoryCatalog();
  const timeZones = useApiData("event-timezones", loadTimeZones);
  const [pickedZone, setPickedZone] = useState(null);
  const timeZoneData = timeZones.data;
  const deviceZone = Object.hasOwn(timeZoneData?.zones ?? {}, detectedTimeZone) ? detectedTimeZone
    : timeZoneData?.aliases[detectedTimeZone];
  const timezone = pickedZone ?? event?.timezone ?? deviceZone ?? "";
  const photo = useProfilePhoto();
  const [imageChanged, setImageChanged] = useState(false);
  const imageUrl = imageChanged ? photo.imageUrl : event?.imageUrl ?? "";
  const guestCount = event?.attendeeIds?.filter((id) => id !== event.organizerId).length ?? 0;
  const { pending, error, setError, submit } = useSubmission();
  const [fieldError, setFieldError] = useState(null);
  const [date, setDate] = useState(event?.date ?? "");
  const [start, setStart] = useState(event?.startTime ?? "");
  const [end, setEnd] = useState(event?.endTime ?? "");
  const duration = durationLabel(start, end);
  const scheduleError = start && end && end <= start ? timeOrderMessage : "";
  const endField = useRef(null);
  useEffect(() => {
    endField.current?.setCustomValidity(scheduleError);
  }, [scheduleError]);
  const categories = catalog.data ?? [];

  function readFields(form) {
    const fields = Object.fromEntries(
      Array.from(new FormData(form), ([key, value]) => [key, value.trim()]),
    );
    fields.capacity = Number(fields.capacity);
    return fields;
  }

  function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    if (!catalog.data || !timeZoneData || pending || blocked || photo.processing) return;

    const form = submitEvent.currentTarget;
    const fields = readFields(form);
    if (imageChanged) fields.imageUrl = photo.imageUrl;
    const issue = findFieldError(fields);
    setFieldError(issue);
    if (issue) {
      (issue[0] === "timezone" ? form.querySelector("#event-timezone") : form.elements.namedItem(issue[0]))?.focus();
      return;
    }
    if (editing && pickedZone === null) delete fields.timezone;
    if (!profileBodyFits(fields)) {
      setError("The event details and image exceed the upload limit. Shorten the description or choose a smaller image.");
      return;
    }
    submit((signal) => onSave(fields, signal), onSuccess);
  }

  async function selectImage(event) {
    const input = event.currentTarget;
    const file = input.files[0];
    input.value = "";
    if (file && await photo.choosePhoto(file, readFields(input.form))) setImageChanged(true);
  }

  function fieldAttributes(name, hintId) {
    const messageId = name === "endTime" && scheduleError ? "event-time-error"
      : fieldError?.[0] === name ? "event-field-error" : "";
    const description = [hintId, messageId].filter(Boolean).join(" ");
    return {
      "aria-invalid": Boolean(messageId),
      "aria-describedby": description || undefined,
    };
  }

  function handleInvalid(event) {
    const field = event.target;
    const firstInvalid = event.currentTarget.querySelector(":is(input, select, textarea):invalid");
    if (field === firstInvalid && (field.name !== "endTime" || !scheduleError)) {
      setFieldError([field.name, field.validationMessage]);
    }
  }

  function resetFieldError(event) {
    const edited = event.target.name;
    const invalid = fieldError?.[0];
    if (invalid === edited || (invalid === "endTime" && edited === "startTime")) setFieldError(null);
  }

  function fieldMessage(name) {
    if (name === "endTime" && scheduleError) {
      return <p id="event-time-error" className="doin-field-error" role="alert">{scheduleError}</p>;
    }
    return fieldError?.[0] === name && (
      <p id="event-field-error" className="doin-field-error" role="alert">{fieldError[1]}</p>
    );
  }

  return (
    <main className="create-event-page doin-page doin-page--app">
      <BackButton onClick={onCancel} ariaLabel={`Back to ${backLabel}`} label={backLabel} disabled={pending} />
      <h1 className="doin-page-title">{editing ? "Edit Event" : "Create an Event"}</h1>
      <form
        className="create-event-form"
        onSubmit={handleSubmit}
        onInvalid={handleInvalid}
        onInput={resetFieldError}
        aria-busy={pending}
      >
        <div className="doin-form-card">
          <fieldset className="doin-form-group">
            <legend>Event information</legend>

            <div className="create-event-field">
              <label className="doin-label" htmlFor="event-title">Event Name</label>
              <input className="doin-input" id="event-title" name="title" type="text"
                placeholder="e.g., Weekend coffee meetup" defaultValue={event?.title} {...fieldAttributes("title")} required />
              {fieldMessage("title")}
            </div>

            <div className="create-event-field">
              <label className="doin-label" htmlFor="event-category">Category</label>
              {catalog.data && (
                <select className="doin-input" id="event-category" name="category"
                  defaultValue={event?.category ?? ""} {...fieldAttributes("category")} required>
                  <option value="">Select a category</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              )}
              {fieldMessage("category")}
              <CatalogStatus catalog={catalog} label="Categories" />
            </div>

            <div className="create-event-field">
              <label className="doin-label" htmlFor="event-description">Description</label>
              <textarea className="doin-input" id="event-description" name="description"
                rows={2} placeholder="What will people do together?" defaultValue={event?.description} {...fieldAttributes("description")} required />
              {fieldMessage("description")}
            </div>
          </fieldset>
        </div>

        <div className="doin-form-card">
          <fieldset className="doin-form-group">
            <legend>Date and time</legend>
            <div className="create-event-field">
              <label className="doin-label" htmlFor="event-date"><Icon name="date" /> Date</label>
              <div className="event-date-display">
                <input className="doin-input" id="event-date" name="date" type="date" max="9999-12-31"
                  value={date} onChange={(event) => setDate(event.target.value)} {...fieldAttributes("date")} required />
                <span className="event-readable-date" aria-hidden="true">
                  {formatEventDate(date, { includeYear: true }) || "Choose a date"}
                </span>
              </div>
              {fieldMessage("date")}
            </div>

            <div className="create-event-times">
              <div className="create-event-field">
                <label className="doin-label" htmlFor="event-start"><Icon name="time" /> Starts at</label>
                <input className="doin-input" id="event-start" name="startTime" type="time"
                  value={start} onChange={(event) => setStart(event.target.value)} {...fieldAttributes("startTime", "event-timezone-hint")} required />
                {fieldMessage("startTime")}
              </div>
              <div className="create-event-field">
                <label className="doin-label" htmlFor="event-end"><Icon name="time" /> Ends at</label>
                <input className="doin-input" id="event-end" name="endTime" type="time" ref={endField}
                  value={end} onChange={(event) => setEnd(event.target.value)} {...fieldAttributes("endTime", "event-timezone-hint")} required />
                {fieldMessage("endTime")}
              </div>
            </div>

            {duration && (
              <output className="event-duration" htmlFor="event-start event-end">Duration {duration}</output>
            )}
            <div className="create-event-field">
              <label className="doin-label" htmlFor="event-timezone"><Icon name="timezone" /> Time zone</label>
              <TimeZoneSelect id="event-timezone" catalog={timeZoneData} value={timezone}
                onChange={setPickedZone} editing={editing} {...fieldAttributes("timezone", "event-timezone-hint")} />
              <p className="event-form-hint" id="event-timezone-hint">
                Search by city, country, or IANA identifier.
              </p>
              {fieldMessage("timezone")}
              <CatalogStatus catalog={timeZones} label="Time zones" />
            </div>
          </fieldset>
        </div>

        <div className="doin-form-card">
          <fieldset className="doin-form-group">
            <legend>Location and attendance</legend>
            <div className="create-event-field">
              <label className="doin-label" htmlFor="event-location"><Icon name="pin" /> Location</label>
              <input className="doin-input" id="event-location" name="location" type="text"
                placeholder="e.g., Central Park" defaultValue={event?.location} {...fieldAttributes("location")} required />
              {fieldMessage("location")}
            </div>

            <div className="create-event-field">
              <label className="doin-label" htmlFor="event-capacity"><Icon name="capacity" /> Maximum Attendees</label>
              <input className="doin-input" id="event-capacity" name="capacity" defaultValue={event?.capacity}
                type="number" min={Math.max(1, guestCount)} step="1" {...fieldAttributes("capacity", "event-capacity-hint")} required />
              <p className="event-form-hint" id="event-capacity-hint">
                Guest spots. Hosts do not count.{editing && ` ${guestCount} currently registered.`}
              </p>
              {fieldMessage("capacity")}
            </div>
            <div className="create-event-field event-image-editor">
              <label className="doin-label" htmlFor="event-image"><Icon name="image" /> Event image <span>(optional)</span></label>
              {imageUrl && imageUrl !== defaultImage && <EventArtwork src={imageUrl} />}
              <input id="event-image" className="doin-input" type="file" accept={profilePhotoTypes}
                onChange={selectImage} disabled={pending || blocked} />
              {imageUrl && imageUrl !== defaultImage && (
                <button className="doin-button doin-button--secondary" type="button" disabled={pending}
                  onClick={() => { photo.setPhoto(""); setImageChanged(true); }}>Remove image</button>
              )}
              {photo.processing && <p role="status">Preparing image…</p>}
              {photo.error && <p className="doin-field-error" role="alert">{photo.error}</p>}
            </div>
          </fieldset>
        </div>

        {!fieldError && error && <p className="doin-field-error" role="alert">{error}</p>}

        <div className="event-form-actions">
          <button type="submit" className="doin-button doin-button--primary create-event-submit"
            aria-busy={pending} disabled={pending || !catalog.data || !timeZoneData || blocked || photo.processing}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create Event"}
          </button>
          <button type="button" className="doin-button doin-button--secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
