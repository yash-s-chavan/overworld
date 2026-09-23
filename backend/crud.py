from sqlalchemy.orm import Session
from datetime import datetime
import models
import schemas
import hashlib
import uuid

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_session(db: Session, session_token: str):
    return db.query(models.User).filter(models.User.session_token == session_token).first()

def create_local_user(db: Session, username: str, password: str):
    user = models.User(
        username=username,
        password=hash_password(password),
        session_token=str(uuid.uuid4())
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return None
    if user.password != hash_password(password):
        return None
    # Refresh session token on login
    user.session_token = str(uuid.uuid4())
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user

def add_discovery(db: Session, user_id: int, track_id: str, environment_tag: str = None):
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

def update_user_onboarding(db: Session, user: models.User, onboarding_data: schemas.UserOnboarding):
    user.display_name = onboarding_data.display_name
    user.avatar_url = onboarding_data.avatar_url
    user.favorite_region = onboarding_data.favorite_region
    user.timezone = onboarding_data.timezone
    user.favorite_pokemon = onboarding_data.favorite_pokemon
    user.theme_color = onboarding_data.theme_color
    user.onboarded = True
    db.commit()
    db.refresh(user)
    return user
