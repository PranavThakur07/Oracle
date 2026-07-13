import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, GOOGLE_CLIENT_ID
from app.database import get_db
from app.models.models import User

# Logging
logger = logging.getLogger("oracle_auth")

# Password Cryptography Context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 schema for dependency injection
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def verify_google_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google OAuth ID token.
    If the token starts with 'mock_', it returns mock user details for developer convenience.
    Otherwise, it contacts Google's tokeninfo endpoint to validate the token.
    """
    if token.startswith("mock_"):
        logger.info("Using mock Google OAuth verification for testing.")
        email = token.replace("mock_", "") + "@gmail.com"
        name = token.replace("mock_", "").title()
        google_id = "google_" + token
        return {"email": email, "name": name, "google_id": google_id}

    # Connect to Google token info API
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                # Verify client ID if configured
                aud = data.get("aud", "")
                if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID != "placeholder-client-id.apps.googleusercontent.com":
                    if aud != GOOGLE_CLIENT_ID:
                        logger.warning(f"Google Token client ID mismatch: {aud} vs {GOOGLE_CLIENT_ID}")
                        return None
                
                return {
                    "email": data.get("email"),
                    "name": data.get("name", data.get("given_name", "")),
                    "google_id": data.get("sub")
                }
            else:
                logger.error(f"Google tokeninfo API returned {response.status_code}: {response.text}")
                return None
        except Exception as e:
            logger.error(f"Exception during Google token verification: {e}")
            return None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Dependency injection to retrieve the authenticated user from the JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
