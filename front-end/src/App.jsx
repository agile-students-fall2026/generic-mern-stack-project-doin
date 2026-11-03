import React from "react";
import EventDetails from "./pages/EventDetails";
import { mockEvent } from "./mocks/events";
import { mockUsers } from "./mocks/users";

const App = (props) => {
  return (
    <div>
      <EventDetails event={mockEvent} users={mockUsers} />
    </div>
  );
};

export default App;
