"""
Simple Streamlit App for Offline Chatbot
Can be used as a standalone application
"""

import streamlit as st
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from code.offline_retrieval import OfflineRetrievalChatbot, handle_conversational_query

# Page config
st.set_page_config(
    page_title="KrishiMitra - Offline Assistant",
    page_icon="🌾",
    layout="wide"
)

# Custom CSS
st.markdown("""
<style>
    .main {
        background-color: #1a1a1a;
    }
    .stTextInput > div > div > input {
        background-color: #2f2f2f;
        color: white;
    }
    .chat-message {
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }
    .user-message {
        background-color: #2f2f2f;
        margin-left: 20%;
    }
    .bot-message {
        background-color: #1f4d3d;
        margin-right: 20%;
    }
</style>
""", unsafe_allow_html=True)

# Initialize chatbot (cached)
@st.cache_resource
def load_chatbot():
    """Load chatbot model (runs once)"""
    with st.spinner("🚀 Loading offline chatbot..."):
        return OfflineRetrievalChatbot(
            data_path='data/finaldata_dipsiv.json'
        )

# Initialize session state
if 'messages' not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": "नमस्ते! 🌾 मैं कृषिमित्र हूं। मैं ऑफलाइन मोड में काम कर रहा हूं।\n\nHello! 🌾 I am KrishiMitra. I'm working in offline mode."
        }
    ]

if 'chatbot' not in st.session_state:
    st.session_state.chatbot = load_chatbot()

# Header
col1, col2 = st.columns([6, 1])
with col1:
    st.title("🌾 KrishiMitra - Offline Assistant")
    st.caption("📴 ऑफलाइन मोड | Offline Mode - स्थानीय डेटा से जवाब | Answers from local data")

with col2:
    language = st.selectbox("Language", ["en", "hi"], label_visibility="collapsed")

# Chat container
chat_container = st.container()

# Display messages
with chat_container:
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

# User input
if prompt := st.chat_input("अपना सवाल पूछें | Ask your question"):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Get bot response
    with st.chat_message("assistant"):
        with st.spinner("सोच रहा हूं... | Thinking..."):
            # Check for conversational queries first
            conversational_response = handle_conversational_query(prompt, language)
            
            if conversational_response:
                response = conversational_response
            else:
                # Use retrieval system
                result = st.session_state.chatbot.chat(prompt, show_confidence=True)
                response = result['answer']
                
                # Show confidence if low
                if result['confidence'] < 0.5:
                    st.caption(f"⚠️ Confidence: {result['confidence']:.0%} - Answer may not be accurate")
        
        st.markdown(response)
    
    # Add assistant response to messages
    st.session_state.messages.append({"role": "assistant", "content": response})

# Sidebar
with st.sidebar:
    st.header("ℹ️ About")
    st.info("""
    **Offline Mode Active**
    
    This chatbot works without internet connection using:
    - Local dataset (3.28 MB)
    - Sentence-transformers
    - FAISS vector search
    
    **Features:**
    - ✅ Works offline
    - ✅ Fast responses
    - ✅ Bilingual (Hindi/English)
    - ✅ Agricultural knowledge
    """)
    
    if st.button("🔄 Clear Chat"):
        st.session_state.messages = [
            {
                "role": "assistant",
                "content": "नमस्ते! 🌾 मैं कृषिमित्र हूं।\n\nHello! 🌾 I am KrishiMitra."
            }
        ]
        st.rerun()
    
    st.divider()
    
    # Statistics
    st.metric("Dataset Size", "35,213 Q&A pairs")
    st.metric("Model", "all-MiniLM-L6-v2")
    
    if 'chatbot' in st.session_state:
        st.success("✅ Chatbot Loaded")
