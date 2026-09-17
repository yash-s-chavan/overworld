from sqlalchemy.orm import Session
from datetime import datetime
import models

def get_user_by_spotify_id(db: Session, spotify_id: str):
    return db.query(models.User).filter(models.User.spotify_id == spotify_id).first()

def create_or_update_user(db: Session, profile: dict):
    spotify_id = profile.get("id")
    if not spotify_id:
        return None

    user = get_user_by_spotify_id(db, spotify_id)
    
    images = profile.get("images", [])
    avatar_url = images[0].get("url") if images else None
    
    if not user:
        user = models.User(
            spotify_id=spotify_id,
            display_name=profile.get("display_name"),
            email=profile.get("email"),
            avatar_url=avatar_url
        )
        db.add(user)
    else:
        user.display_name = profile.get("display_name", user.display_name)
        user.email = profile.get("email", user.email)
        user.avatar_url = avatar_url or user.avatar_url
        user.last_login = datetime.utcnow()
        
    db.commit()
    db.refresh(user)
    return user

def add_discovery(db: Session, user_id: int, track_id: str, environment_tag: str = None):
    # Check if already discovered
    existing = db.query(models.Discovery).filter(
        models.Discovery.user_id == user_id,
        models.Discovery.track_id == track_id
    ).first()
    
    if existing:
        return existing
        
    discovery = models.Discovery(
        user_id=user_id,
        track_id=track_id,
        environment_tag=environment_tag
    )
    db.add(discovery)
    db.commit()
    db.refresh(discovery)
    return discovery

def get_user_discoveries(db: Session, user_id: int):
    return db.query(models.Discovery).filter(models.Discovery.user_id == user_id).all()
