from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
import requests

from database import get_db
import crud
import schemas

router = APIRouter(prefix="/users", tags=["users"])

def get_current_user_profile(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get("https://api.spotify.com/v1/me", headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Spotify token")
        
    return response.json()

@router.get("/me", response_model=schemas.UserProfileResponse)
def get_or_create_me(profile: dict = Depends(get_current_user_profile), db: Session = Depends(get_db)):
    """Gets the current user, or creates one if it's their first login."""
    user = crud.create_or_update_user(db, profile)
    if not user:
        raise HTTPException(status_code=400, detail="Could not create user from Spotify profile")
    return user

@router.post("/me/discoveries", response_model=schemas.DiscoveryResponse)
def add_discovery(
    discovery: schemas.DiscoveryCreate,
    profile: dict = Depends(get_current_user_profile),
    db: Session = Depends(get_db)
):
    """Adds a discovered track for the current user."""
    user = crud.create_or_update_user(db, profile)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    return crud.add_discovery(db, user.id, discovery.track_id, discovery.environment_tag)

@router.get("/me/discoveries", response_model=List[schemas.DiscoveryResponse])
def get_my_discoveries(profile: dict = Depends(get_current_user_profile), db: Session = Depends(get_db)):
    """Gets all discovered tracks for the current user."""
    user = crud.create_or_update_user(db, profile)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    return crud.get_user_discoveries(db, user.id)
