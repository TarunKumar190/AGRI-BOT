import React from "react";
import SchemeList from "../components/SchemeList";
import UpdatesFeed from "../components/UpdatesFeed";
import ChatStyled from "../components/ChatStyled";
import WeatherWidget from "../components/WeatherWidget";
import DiseaseUpload from "../components/DiseaseUpload";

export default function Home() {
  return (
    <div className="container">
      <header className="header">
        <div>
          <div className="h-title">AgriBotAI — Multilingual Agriculture Assistant</div>
          <div className="small">Live schemes, weather, disease detection & chat</div>
        </div>

        <div>
          <select className="input" defaultValue="en" style={{ marginRight: 8 }}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="bn">বাংলা</option>
            <option value="mr">मराठी</option>
            <option value="ta">தமிழ்</option>
          </select>

          <button className="btn">Sign in</button>
        </div>
      </header>

      <div className="grid">
        <aside>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3>Government Schemes</h3>
            <SchemeList />
          </div>

          <UpdatesFeed />
        </aside>

        <section className="card">
          <WeatherWidget />
          <h3 style={{ marginTop: 6 }}>Chat</h3>
          <div style={{ height: "calc(100% - 160px)" }}>
            <ChatStyled />
          </div>
        </section>

        <aside className="card">
          <h3>Plant Disease Detection</h3>
          <DiseaseUpload />
        </aside>
      </div>
    </div>
  );
}
