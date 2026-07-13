import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Config
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/oracle")

# Gemini API Config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# JWT Auth Config
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "oracle-secret-key-for-jwt-signing-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # Default: 30 days

# Google OAuth Config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Server Config
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")
