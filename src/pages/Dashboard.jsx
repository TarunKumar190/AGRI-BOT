import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import HomeView from '../components/HomeView';
import ChatBot from '../components/ChatBot';
import DiseaseDetection from '../components/DiseaseDetection';
import WeatherWidget from '../components/WeatherWidget';
import MarketPrices from '../components/MarketPrices';
import SchemeList from '../components/SchemeList';
import UpdatesFeed from '../components/UpdatesFeed';
import SettingsView from '../components/SettingsView';
import './Dashboard.css';

const Dashboard = ({ userProfile }) => {
  const [activeView, setActiveView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView userProfile={userProfile} onNavigate={setActiveView} />;
      case 'chat':
        return <ChatBot />;
      case 'disease':
        return <DiseaseDetection />;
      case 'weather':
        return <WeatherWidget expanded />;
      case 'market':
        return <MarketPrices />;
      case 'schemes':
        return <SchemeList />;
      case 'updates':
        return <UpdatesFeed />;
      case 'settings':
        return <SettingsView userProfile={userProfile} />;
      default:
        return <HomeView userProfile={userProfile} onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          setSidebarOpen(false);
        }}
      />
      
      <div className="dashboard-main">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          activeView={activeView}
        />
        
        <main className="dashboard-content">
          {renderView()}
        </main>
        
        {/* Mobile Bottom Navigation */}
        <nav className="mobile-nav">
          <button 
            className={`nav-item ${activeView === 'home' ? 'active' : ''}`}
            onClick={() => setActiveView('home')}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">{t('nav.home')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveView('chat')}
          >
            <span className="nav-icon">💬</span>
            <span className="nav-label">{t('nav.chat')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'disease' ? 'active' : ''}`}
            onClick={() => setActiveView('disease')}
          >
            <span className="nav-icon">🔬</span>
            <span className="nav-label">{t('nav.disease')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'market' ? 'active' : ''}`}
            onClick={() => setActiveView('market')}
          >
            <span className="nav-icon">📈</span>
            <span className="nav-label">{t('nav.market')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'schemes' ? 'active' : ''}`}
            onClick={() => setActiveView('schemes')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">{t('nav.schemes')}</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Dashboard;
