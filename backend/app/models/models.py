import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True) # Nullable for purely Google-registered users
    google_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    decisions = relationship("Decision", back_populates="user", cascade="all, delete-orphan")

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query = Column(String, nullable=False)  # The decision statement (e.g. "Should I pursue an MBA after MCA?")
    context = Column(JSON, nullable=False)   # Store age, budget, time_horizon, risk_appetite, country, career_goals, etc.
    response_json = Column(JSON, nullable=False) # Store complete raw AI response containing scenarios, recommendations, and disclaimers
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="decisions")
    follow_ups = relationship("FollowUp", back_populates="decision", cascade="all, delete-orphan")

class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("decisions.id"), nullable=False)
    query = Column(String, nullable=False) # The follow-up question/statement
    response_json = Column(JSON, nullable=False) # Store refined scenarios or text-based conversation response
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    decision = relationship("Decision", back_populates="follow_ups")
