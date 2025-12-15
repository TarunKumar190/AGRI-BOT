import React from "react";
import "./styles/app.css";
import SchemeList from "./components/SchemeList";
import UpdatesFeed from "./components/UpdatesFeed";
import WeatherWidget from "./components/WeatherWidget";
import ChatBot from "./components/ChatBot";
import { LanguageProvider } from "./context/LanguageContext";
import "./styles/dashboard.css";

export default function App() {
  return (
    <LanguageProvider>
      <div className="app">
        <header>
          <h1>AgriBotAI — Multilingual Agriculture Assistant</h1>
          <p>Live schemes, updates & AI chat</p>
        </header>

        <main className="grid">
          <div className="left">
            <SchemeList />
            <UpdatesFeed />
          </div>

          <div className="right">
            <WeatherWidget />
            <ChatBot />
          </div>
        </main>
      </div>
    </LanguageProvider>
  );
}