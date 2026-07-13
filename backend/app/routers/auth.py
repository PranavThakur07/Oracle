from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, GoogleLoginRequest, Token, UserOut
from app.services.auth import hash_password, verify_password, create_access_token, verify_google_token, get_current_user
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Create new user
    hashed_pwd = hash_password(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        name=user_in.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Generate token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google", response_model=Token)
async def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    google_data = await verify_google_token(payload.token)
    if not google_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google OAuth ID token."
        )

    email = google_data["email"]
    google_id = google_data["google_id"]
    name = google_data["name"]

    # Check if user already exists
    user = db.query(User).filter((User.email == email) | (User.google_id == google_id)).first()

    if not user:
        # Create Google registered user
        user = User(
            email=email,
            google_id=google_id,
            name=name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.google_id:
        # User exists by email (password login) - link Google profile
        user.google_id = google_id
        if name and not user.name:
            user.name = name
        db.commit()
        db.refresh(user)

    # Generate token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
