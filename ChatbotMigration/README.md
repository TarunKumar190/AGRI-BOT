# Migration Package for Offline Retrieval-Based Chatbot

This package contains all files needed to run the offline chatbot on another Windows device.

## 📦 Package Contents

```
ChatbotMigration/
├── code/
│   ├── offline_retrieval.py     # Main retrieval system
│   ├── streamlit_app.py         # Streamlit web interface
│   └── offlineSearch.js         # Original JS implementation
├── data/
│   └── finaldata_dipsiv.json    # Dataset (3.28 MB, 35,213 Q&A pairs)
├── models/
│   └── (models will auto-download)
└── requirements/
    └── requirements.txt         # Python dependencies
```

## 🚀 Quick Start

### 1. Install Python
- Download Python 3.9+ from python.org
- ✅ Check "Add Python to PATH" during installation

### 2. Setup Environment
```cmd
cd ChatbotMigration
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies
```cmd
pip install -r requirements/requirements.txt
```

### 4. Run the Chatbot
```cmd
streamlit run code/streamlit_app.py
```

## 🔧 Testing

Test the setup with:
```cmd
cd code
python offline_retrieval.py
```

## 📊 Features

✅ **Offline Operation**: Works without internet
✅ **Fast Search**: FAISS vector similarity search
✅ **Bilingual**: Hindi and English support
✅ **35,213 Q&A pairs**: Comprehensive agricultural knowledge
✅ **Conversational**: Handles greetings and basic chat

## 💡 Usage Examples

### Python API
```python
from code.offline_retrieval import OfflineRetrievalChatbot

# Initialize
chatbot = OfflineRetrievalChatbot(data_path='data/finaldata_dipsiv.json')

# Get answer
response = chatbot.get_answer("What is PM-KISAN?")
print(response)

# Get top 3 matches
results = chatbot.search("crop disease", top_k=3)
for r in results:
    print(f"{r['question']}: {r['confidence']:.2%}")
```

### Web Interface
```cmd
streamlit run code/streamlit_app.py
```
Then open: http://localhost:8501

## 📝 System Requirements

- **OS**: Windows 10/11
- **RAM**: 2GB minimum (4GB recommended)
- **Disk**: 500MB free space
- **Python**: 3.9 or higher

## 🐛 Troubleshooting

**Model not downloading?**
```cmd
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

**Import errors?**
```cmd
pip install --upgrade pip
pip install -r requirements/requirements.txt --force-reinstall
```

**Port already in use?**
```cmd
streamlit run code/streamlit_app.py --server.port 8502
```

## 📚 Documentation

- **Model**: sentence-transformers/all-MiniLM-L6-v2
- **Search**: FAISS with L2 distance
- **Dataset**: Custom agricultural Q&A corpus

## 🔗 Integration

To integrate into existing apps:
```python
from code.offline_retrieval import OfflineRetrievalChatbot

chatbot = OfflineRetrievalChatbot(data_path='data/finaldata_dipsiv.json')
answer = chatbot.get_answer(user_query)
```

## ✅ Verification Checklist

- [ ] Python installed and in PATH
- [ ] Virtual environment created
- [ ] Dependencies installed successfully
- [ ] Dataset file present (3.28 MB)
- [ ] Test script runs without errors
- [ ] Streamlit app launches
- [ ] Chatbot responds correctly

---

**Created**: December 18, 2025
**Dataset**: 35,213 agricultural Q&A pairs
**Languages**: Hindi (हिंदी) and English
