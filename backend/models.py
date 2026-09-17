from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    spotify_id = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
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
