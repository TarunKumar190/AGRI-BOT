"""
Test script to verify the setup
Run this before using the chatbot to check everything is working
"""

import sys
import os

def test_imports():
    """Test if all required packages are installed"""
    print("🧪 Testing imports...")
    
    try:
        import json
        print("  ✓ json")
    except ImportError:
        print("  ✗ json - FAILED")
        return False
    
    try:
        import numpy as np
        print(f"  ✓ numpy (version {np.__version__})")
    except ImportError:
        print("  ✗ numpy - FAILED (run: pip install numpy)")
        return False
    
    try:
        from sentence_transformers import SentenceTransformer
        print("  ✓ sentence-transformers")
    except ImportError:
        print("  ✗ sentence-transformers - FAILED (run: pip install sentence-transformers)")
        return False
    
    try:
        import faiss
        print("  ✓ faiss")
    except ImportError:
        print("  ✗ faiss - FAILED (run: pip install faiss-cpu)")
        return False
    
    try:
        import streamlit
        print("  ✓ streamlit")
    except ImportError:
        print("  ✗ streamlit - FAILED (run: pip install streamlit)")
        return False
    
    return True


def test_dataset():
    """Test if dataset file exists and is valid"""
    print("\n📂 Testing dataset...")
    
    data_path = 'data/finaldata_dipsiv.json'
    
    if not os.path.exists(data_path):
        print(f"  ✗ Dataset not found at: {data_path}")
        return False
    
    try:
        import json
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"  ✓ Dataset loaded successfully")
        print(f"  ✓ Records found: {len(data):,}")
        
        # Check structure
        if len(data) > 0:
            sample = data[0]
            if 'question' in sample and 'answer' in sample:
                print(f"  ✓ Valid data structure")
            else:
                print(f"  ✗ Invalid data structure")
                return False
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error loading dataset: {e}")
        return False


def test_model():
    """Test if model can be loaded"""
    print("\n🤖 Testing model...")
    
    try:
        from sentence_transformers import SentenceTransformer
        
        print("  Downloading/loading model (first time may take a few minutes)...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Test encoding
        test_text = "Test sentence"
        embedding = model.encode([test_text])
        
        print(f"  ✓ Model loaded successfully")
        print(f"  ✓ Embedding dimension: {embedding.shape[1]}")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error loading model: {e}")
        return False


def test_chatbot():
    """Test the complete chatbot system"""
    print("\n💬 Testing chatbot...")
    
    try:
        # Add parent directory to path
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        from code.offline_retrieval import OfflineRetrievalChatbot
        
        print("  Initializing chatbot...")
        chatbot = OfflineRetrievalChatbot(data_path='data/finaldata_dipsiv.json')
        
        # Test query
        test_query = "What is PM-KISAN?"
        print(f"\n  Testing query: '{test_query}'")
        
        result = chatbot.chat(test_query, show_confidence=True)
        
        print(f"  ✓ Answer received")
        print(f"  ✓ Confidence: {result['confidence']:.0%}")
        print(f"\n  Preview: {result['answer'][:150]}...")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error testing chatbot: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("  KrishiMitra Offline Chatbot - Setup Verification")
    print("=" * 60)
    print()
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("Dataset", test_dataset()))
    results.append(("Model", test_model()))
    results.append(("Chatbot", test_chatbot()))
    
    # Summary
    print("\n" + "=" * 60)
    print("  Test Summary")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {name:15} {status}")
        if not passed:
            all_passed = False
    
    print()
    
    if all_passed:
        print("🎉 All tests passed! Your chatbot is ready to use.")
        print("\nYou can now:")
        print("  1. Run: streamlit run code/streamlit_app.py")
        print("  2. Or double-click: START_CHATBOT.bat")
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        print("\nCommon solutions:")
        print("  • Run: pip install -r requirements/requirements.txt")
        print("  • Check if dataset file exists in data/ folder")
        print("  • Ensure Python 3.9+ is installed")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
    input("\nPress Enter to exit...")
