import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import LoginGate from "./LoginGate.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoginGate>{(session) => <App accessToken={session.access_token} />}</LoginGate>
  </React.StrictMode>
);
