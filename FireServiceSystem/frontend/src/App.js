import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./auth/login";
import Dashboard from "./dashboard/Dashboard";
import Register from "./auth/register";

function App() {
  const [username, setUsername] = useState("");

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setUsername={setUsername} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Dashboard username={username} />} />
      </Routes>
    </Router>
  );
}

export default App;