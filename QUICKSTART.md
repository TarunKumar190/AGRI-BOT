# 🚀 Quick Start - Agriculture Chatbot

## Prerequisites
- Node.js 20.18+ installed
- MongoDB installed and running
- PowerShell terminal

## Start in 5 Minutes

### Terminal 1: Frontend
```powershell
cd C:\Users\ASUS\Desktop\Agri-demo\Agri-Bot-UI-Government-Schemes
npm run dev
```
✅ Frontend will start on **http://localhost:5174**

### Terminal 2: Backend (Optional for live data)
```powershell
cd C:\Users\ASUS\Desktop\Agri-demo\Agri-Bot-UI-Government-Schemes
npm run server
```
✅ Backend will start on **http://localhost:4000**

### Terminal 3: RSS Scraper (Optional for live updates)
```powershell
cd C:\Users\ASUS\Desktop\Agri-demo\Agri-Bot-UI-Government-Schemes
npm run scrape
```
✅ Will fetch latest agriculture updates

## What's Working Right Now

### ✅ Without Backend
- Frontend UI fully functional
- Fallback data showing in:
  - Government Schemes list
  - Live Updates feed
- Chatbot interface ready
- Language switching (EN/HI)
- All styling and animations

### ✅ With Backend
Everything above PLUS:
- Real-time updates from MongoDB
- Live chatbot responses
- Scheme search functionality
- Auto-refresh every 2 minutes
- RSS feed integration

## Features Showcase

### 1. **Live Updates Feed**
- Scrollable list of agriculture updates
- Color-coded severity badges
- Time stamps
- Auto-refresh
- Hover effects

### 2. **Government Schemes**
- List of available schemes
- Details and descriptions
- Eligibility information
- Benefits listed

### 3. **AI Chatbot** 🤖
- Ask questions in English or Hindi
- Natural language search
- Get scheme information
- Latest updates included
- Typing indicator
- Smooth animations

### 4. **Language Toggle**
- Switch between English and Hindi
- Instant UI translation
- Chatbot responds in selected language

## Test the Chatbot

Try these queries:

**English:**
- "Tell me about PM-KISAN"
- "What are crop insurance schemes?"
- "Latest agriculture updates"
- "Fertilizer subsidy"

**Hindi:**
- "पीएम-किसान के बारे में बताएं"
- "फसल बीमा योजनाएं"
- "ताज़ा कृषि अपडेट"

## Troubleshooting

### Can't see the page?
- Check if dev server is running
- Visit http://localhost:5174
- Check terminal for errors

### Chatbot not responding?
- Start backend server (Terminal 2)
- Check MongoDB is running: `net start MongoDB`
- Verify backend is on port 4000

### No live updates?
- Run the scraper (Terminal 3)
- Or use fallback data (already working)

## Current Status

✅ **Frontend**: Fully operational
✅ **UI/UX**: Modern & professional
✅ **Components**: All working
✅ **Styling**: Complete
✅ **Animations**: Smooth
✅ **Multilingual**: EN/HI ready
✅ **Backend Ready**: Just need to start server

## Next Steps

1. Open http://localhost:5174 in browser
2. Test the interface
3. Toggle language (EN ↔ HI)
4. Check live updates scrolling
5. Try chatbot queries
6. (Optional) Start backend for live data

---

**Note**: The application works perfectly with fallback data. Backend is only needed for:
- Real-time RSS updates
- Live chatbot queries to database
- Admin panel functionality

**Enjoy your Agriculture Chatbot! 🌾**
