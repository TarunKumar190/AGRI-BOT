"""
Offline Retrieval-Based Chatbot System
Migrated from JavaScript to Python for better ML integration
"""

import json
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from typing import List, Dict, Tuple
import os

class OfflineRetrievalChatbot:
    """
    Offline chatbot using semantic search on pre-loaded dataset
    Works without internet connection
    """
    
    def __init__(self, data_path: str = 'data/finaldata_dipsiv.json', model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the chatbot with dataset and embedding model
        
        Args:
            data_path: Path to the JSON dataset
            model_name: Sentence transformer model name
        """
        print("🚀 Initializing Offline Chatbot...")
        
        # Load model
        print(f"📦 Loading model: {model_name}")
        self.model = SentenceTransformer(model_name)
        
        # Load dataset
        print(f"📂 Loading dataset from: {data_path}")
        self.data = self._load_dataset(data_path)
        
        # Build FAISS index
        print("🔨 Building FAISS index...")
        self.index, self.embeddings = self._build_index()
        
        print(f"✅ Chatbot ready! Loaded {len(self.data)} Q&A pairs")
    
    def _load_dataset(self, data_path: str) -> List[Dict]:
        """Load and parse the JSON dataset"""
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Dataset not found at: {data_path}")
        
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
    
    def _build_index(self) -> Tuple[faiss.Index, np.ndarray]:
        """
        Build FAISS index for fast similarity search
        Returns index and embeddings array
        """
        # Extract questions
        questions = [item['question'] for item in self.data]
        
        # Generate embeddings
        print("  Generating embeddings...")
        embeddings = self.model.encode(questions, show_progress_bar=True)
        embeddings = embeddings.astype('float32')
        
        # Create FAISS index
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)  # L2 distance
        index.add(embeddings)
        
        return index, embeddings
    
    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """
        Search for similar questions and return answers
        
        Args:
            query: User's question
            top_k: Number of top results to return
            
        Returns:
            List of matching results with questions, answers, and confidence scores
        """
        # Encode query
        query_embedding = self.model.encode([query]).astype('float32')
        
        # Search in FAISS index
        distances, indices = self.index.search(query_embedding, top_k)
        
        # Prepare results
        results = []
        for idx, dist in zip(indices[0], distances[0]):
            # Convert L2 distance to similarity score (inverse)
            confidence = 1 / (1 + dist)
            
            result = {
                'question': self.data[idx]['question'],
                'answer': self.data[idx]['answer'],
                'confidence': float(confidence),
                'distance': float(dist)
            }
            results.append(result)
        
        return results
    
    def get_answer(self, query: str, threshold: float = 0.3) -> str:
        """
        Get the best answer for a query
        
        Args:
            query: User's question
            threshold: Minimum confidence threshold
            
        Returns:
            Answer string or fallback message
        """
        results = self.search(query, top_k=1)
        
        if not results:
            return "माफ़ करें, मुझे इसका उत्तर नहीं मिला। | Sorry, I couldn't find an answer."
        
        best_match = results[0]
        
        if best_match['confidence'] < threshold:
            return (
                f"मुझे पूरा यकीन नहीं है, लेकिन यह मदद कर सकता है:\n\n"
                f"I'm not fully confident, but this might help:\n\n"
                f"{best_match['answer']}"
            )
        
        return best_match['answer']
    
    def chat(self, query: str, show_confidence: bool = False) -> Dict:
        """
        Complete chat interaction
        
        Args:
            query: User's question
            show_confidence: Whether to include confidence scores
            
        Returns:
            Dictionary with answer and metadata
        """
        results = self.search(query, top_k=1)
        
        if not results:
            return {
                'answer': "माफ़ करें, मुझे इसका उत्तर नहीं मिला। | Sorry, I couldn't find an answer.",
                'confidence': 0.0,
                'matched_question': None
            }
        
        best_match = results[0]
        
        response = {
            'answer': best_match['answer'],
            'confidence': best_match['confidence'],
            'matched_question': best_match['question']
        }
        
        if not show_confidence:
            response.pop('confidence', None)
            response.pop('matched_question', None)
        
        return response


# Conversational Handlers (for greetings, etc.)
def handle_conversational_query(query: str, language: str = 'en') -> str:
    """Handle basic conversational queries"""
    q = query.lower().strip()
    is_hindi = language == 'hi'
    
    # Greetings
    greetings = ['hello', 'hi', 'hey', 'namaste', 'नमस्ते', 'नमस्कार']
    if any(q.startswith(g) for g in greetings):
        return (
            'नमस्ते! 🙏 मैं कृषिमित्र हूं। मैं आपकी खेती में मदद कर सकता हूं।\n\n'
            'Hello! 🙏 I am KrishiMitra. I can help you with farming.'
        ) if is_hindi else 'Hello! 🙏 I am KrishiMitra, your AI farming assistant.'
    
    # Goodbyes
    goodbyes = ['bye', 'goodbye', 'thanks', 'धन्यवाद']
    if any(g in q for g in goodbyes):
        return 'धन्यवाद! 🙏 खेती में शुभकामनाएं।' if is_hindi else 'Thank you! 🙏 Best wishes for your farming.'
    
    return None


# Example usage
if __name__ == "__main__":
    # Initialize chatbot
    chatbot = OfflineRetrievalChatbot(
        data_path='../data/finaldata_dipsiv.json'
    )
    
    # Test queries
    test_queries = [
        "What is PM-KISAN?",
        "गेहूं की खेती कैसे करें?",
        "मंडी भाव",
    ]
    
    print("\n" + "="*60)
    print("Testing Chatbot")
    print("="*60 + "\n")
    
    for query in test_queries:
        print(f"Q: {query}")
        response = chatbot.chat(query, show_confidence=True)
        print(f"A: {response['answer'][:200]}...")
        print(f"Confidence: {response['confidence']:.2%}")
        print(f"Matched: {response['matched_question']}")
        print("-" * 60 + "\n")
