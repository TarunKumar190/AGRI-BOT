# 🌾 Agriculture Chatbot - Complete Setup Guide

## Overview
An intelligent agriculture chatbot that provides real-time government scheme updates, weather information, and crop advice. The system scrapes RSS feeds from agricultural websites and provides multilingual support (English/Hindi).

## Architecture

### Frontend (Vite + React)
- **Port**: 5174
- Responsive UI with live updates
- Multilingual chatbot interface
- Real-time scheme and update feeds

### Backend (Express + MongoDB)
- **Port**: 4000
- REST API for schemes and updates
- Admin approval workflow
- JWT authentication

### Data Pipeline (RSS Scraper)
- Automated RSS feed parsing
- PIB Agriculture updates
- Auto-approve for demo (low severity)

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Backend API
VITE_API_BASE=http://localhost:4000

# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/agri_demo

# JWT Secret
JWT_SECRET=your_secret_key_change_in_production

# For development (skip auth)
IGNORE_AUTH=1

# Admin token (generate using create_jwt.js)
ADMIN_TOKEN=your_jwt_token
```

### 3. Start MongoDB

Ensure MongoDB is running on your system:

```powershell
# Check if MongoDB is running
mongod --version

# Start MongoDB service (if needed)
net start MongoDB
```

### 4. Generate Admin Token (First Time Only)

```powershell
node create_jwt.js
```

Copy the generated token and add it to your `.env` file as `ADMIN_TOKEN`.

### 5. Start Backend Server

```powershell
npm run server
```

Server will start on http://localhost:4000

### 6. Start Frontend Dev Server

In a new terminal:

```powershell
npm run dev
```

Frontend will start on http://localhost:5174

### 7. (Optional) Seed Initial Data

```powershell
npm run seed
```

### 8. (Optional) Run RSS Scraper

```powershell
npm run scrape
```

This will fetch latest agriculture updates from PIB and other sources.

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── ChatBot.jsx          # Main chatbot component
│   │   ├── UpdatesFeed.jsx      # Live updates display
│   │   ├── SchemeList.jsx       # Government schemes list
│   │   └── WeatherWidget.jsx    # Weather information
│   ├── context/
│   │   └── LanguageContext.jsx  # i18n context provider
│   ├── data/
│   │   ├── staticSchemes.js     # Fallback scheme data
│   │   └── staticUpdates.js     # Fallback updates
│   └── styles/
│       ├── app.css              # Main styles
│       └── ChatBot.css          # Chatbot styles
├── server.js                    # Express backend
├── connectors.js                # RSS scraper
├── seed_schemes.js              # Database seeder
└── vite.config.js               # Vite configuration
```

## 🔧 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Frontend Dev | `npm run dev` | Start Vite dev server |
| Backend | `npm run server` | Start Express API server |
| Scraper | `npm run scrape` | Run RSS feed scraper |
| Seed DB | `npm run seed` | Populate database with initial data |
| Build | `npm run build` | Build for production |
| Preview | `npm run preview` | Preview production build |

## 🌐 API Endpoints

### Public Endpoints

- `GET /v1/health` - Health check
- `GET /v1/schemes` - List all schemes
- `GET /v1/schemes/:id` - Get scheme by ID
- `GET /v1/updates` - Get approved updates
- `GET /v1/chatbot?q=keyword` - Chatbot query endpoint

### Protected Endpoints (Require JWT)

- `POST /v1/ingest` - Ingest new scheme/update
- `GET /v1/admin/updates` - List pending updates
- `POST /v1/approve/:id` - Approve update
- `POST /v1/reject/:id` - Reject update

## 🤖 Chatbot Features

1. **Natural Language Queries**: Ask about schemes in plain language
2. **Multilingual Support**: Toggle between English and Hindi
3. **Real-time Updates**: Fetches latest approved updates
4. **Scheme Search**: Searches schemes by name, description, or keywords
5. **Context-Aware**: Provides relevant scheme information with latest updates

Example queries:
- "Tell me about PM-KISAN scheme"
- "What are the latest updates?"
- "Crop insurance schemes"
- "किसान योजनाओं के बारे में बताएं"

## 📊 Data Flow

```
RSS Feeds → connectors.js → POST /v1/ingest → MongoDB
                                ↓
                          Auto-approve (low severity)
                                ↓
                          GET /v1/updates → Frontend
```

## 🔐 Authentication

The system uses JWT tokens for authentication. For development:

1. Set `IGNORE_AUTH=1` in `.env` to bypass authentication
2. For production, generate tokens using `create_jwt.js`

## 🛠️ Troubleshooting

### Issue: Connection Refused (localhost:5174)
**Solution**: Ensure Vite dev server is running with `npm run dev`

### Issue: Cannot connect to MongoDB
**Solution**: 
- Check if MongoDB service is running
- Verify `MONGO_URI` in `.env`
- Try: `net start MongoDB`

### Issue: Chatbot not responding
**Solution**:
- Ensure backend is running on port 4000
- Check browser console for errors
- Verify `VITE_API_BASE` in `.env`

### Issue: No updates showing
**Solution**:
- Run the scraper: `npm run scrape`
- Or seed initial data: `npm run seed`
- Check MongoDB for approved updates

### Issue: Node.js version warning
**Solution**: 
- Current version: 20.18.0
- Recommended: Upgrade to 20.19+ or 22.12+
- App will still work with warnings

## 🌟 Features

- ✅ Real-time RSS feed scraping
- ✅ Multilingual support (EN/HI)
- ✅ Auto-scrolling live updates
- ✅ Interactive chatbot with backend integration
- ✅ Admin approval workflow
- ✅ Responsive design
- ✅ Fallback data for offline mode
- ✅ Auto-refresh updates every 2 minutes

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| VITE_API_BASE | No | http://localhost:4000 | Backend API URL |
| MONGO_URI | Yes | mongodb://127.0.0.1:27017/agri_demo | MongoDB connection |
| JWT_SECRET | Yes | - | Secret key for JWT |
| ADMIN_TOKEN | Yes (for scraper) | - | JWT token for API calls |
| IGNORE_AUTH | No | 0 | Skip auth in development |

## 🎨 Customization

### Adding New RSS Sources

Edit `connectors.js` and add your RSS feed URL:

```javascript
const sources = [
  { url: 'https://example.com/feed.xml', type: 'rss' },
  // Add more sources
];
```

### Changing Auto-refresh Interval

Edit `src/components/UpdatesFeed.jsx`:

```javascript
const interval = setInterval(fetchUpdates, 120000); // 2 minutes
```

## 📦 Production Deployment

1. Build the frontend:
```powershell
npm run build
```

2. Set production environment variables

3. Use PM2 or similar for backend:
```powershell
pm2 start server.js --name agri-backend
```

4. Serve static files with nginx or similar

## 🤝 Contributing

This is a hackathon/demo project. Feel free to extend and improve!

## 📄 License

ISC

---

**Need Help?** Check the console logs or MongoDB logs for detailed error messages.
