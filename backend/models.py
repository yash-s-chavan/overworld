from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    session_token = Column(String, unique=True, index=True, nullable=True)
    spotify_id = Column(String, unique=True, index=True, nullable=True)
    spotify_access_token = Column(String, nullable=True)
    spotify_refresh_token = Column(String, nullable=True)
    
    display_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    favorite_region = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    favorite_pokemon = Column(String, nullable=True)
    theme_color = Column(String, default="#ff4757")
    onboarded = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)

    discoveries = relationship("Discovery", back_populates="user")

class Discovery(Base):
    __tablename__ = "discoveries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    track_id = Column(String, index=True, nullable=False)  # the ID from the catalog
    environment_tag = Column(String, nullable=True) # where they discovered it
    discovered_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="discoveries")

    __table_args__ = (
        UniqueConstraint('user_id', 'track_id', name='uq_user_track_discovery'),
    )
