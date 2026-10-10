import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import NewLesson from "./pages/NewLesson.jsx";
import Workspace from "./pages/Workspace.jsx";
import Chat from "./pages/Chat.jsx";
import Mcq from "./pages/Mcq.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewLesson />} />
        <Route path="/lesson/:id" element={<Workspace />} />
        <Route path="/lesson/:id/chat" element={<Chat />} />
        <Route path="/lesson/:id/mcq" element={<Mcq />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
