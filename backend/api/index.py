"""
Vercel Serverless Entry Point
Re-exports the full FastAPI app from main.py
"""
import os
import sys

# Add parent directory to path so imports work on Vercel serverless environment
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

from main import app
