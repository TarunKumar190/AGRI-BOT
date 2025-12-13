import React from "react";
import "./styles/app.css";
import SchemesList from "./components/SchemeList";
import UpdatesFeed from "./components/UpdatesFeed";
import WeatherWidget from "./components/WeatherWidget";
import ChatBot from "./components/ChatBot";
import { useLanguage } from "./context/LanguageContext";
import "./styles/dashboard.css";
import ChatMessages from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";

export default function App() {
  const schemes = [
  { text: "PM-KISAN — ₹6,000 annual income support" },
  { text: "Soil Health Card Scheme" },
  { text: "Kisan Credit Card (KCC)" }
];

const updates = [
  { text: "Advisory released for wheat farmers" },
  { text: "Rain alert issued in north region" },
  { text: "PMFBY enrollment extended" }
];

return (
    <div className="app">
      <header>
        <h1>AgriBotAI — Multilingual Agriculture Assistant</h1>
        <p>Live schemes, updates & AI chat</p>
      </header>

      <main className="grid">
        <div className="left">
          <SchemeList />
          <LiveUpdates />
        </div>

        <div className="right">
          <Chatbot />
        </div>
      </main>
    </div>
  );
}