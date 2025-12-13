import UpdatesFeed from "./UpdatesFeed";
import SchemeList from "./SchemeList";
import WeatherWidget from "./WeatherWidget";
import { useLanguage } from "../context/LanguageContext";

export default function SidePanel() {
  const { language } = useLanguage();

  return (
    <div className="side-panel">
      <div className="panel-card">
        <h3>{language === "hi" ? "लाइव अपडेट" : "Live Updates"}</h3>
        <UpdatesFeed />
      </div>

      <div className="panel-card">
        <h3>{language === "hi" ? "सरकारी योजनाएँ" : "Government Schemes"}</h3>
        <SchemeList />
      </div>

      <div className="panel-card">
        <h3>{language === "hi" ? "मौसम" : "Weather"}</h3>
        <WeatherWidget />
      </div>
    </div>
  );
}
