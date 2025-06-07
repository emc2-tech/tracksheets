
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-this'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///tracksheets.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173').split(',')
    WORKBOOKS_DIR = os.environ.get('WORKBOOKS_DIR', 'workbooks')
    
    # Ensure workbooks directory exists
    os.makedirs(WORKBOOKS_DIR, exist_ok=True)