from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud
import schemas

router = APIRouter(prefix="/users", tags=["users"])

def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    user = crud.get_user_by_session(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session token")
    return user

@router.get("/me", response_model=schemas.UserProfileResponse)
def get_me(user = Depends(get_current_user)):
    user.spotify_linked = bool(user.spotify_id)
    return user

@router.post("/me/discoveries", response_model=schemas.DiscoveryResponse)
def add_discovery(
    discovery: schemas.DiscoveryCreate,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds a discovered track for the current user."""
    return crud.add_discovery(db, user.id, discovery.track_id, discovery.environment_tag)

@router.get("/me/discoveries", response_model=List[schemas.DiscoveryResponse])
def get_my_discoveries(user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Gets all discovered tracks for the current user."""
    return crud.get_user_discoveries(db, user.id)

@router.patch("/me/onboarding", response_model=schemas.UserProfileResponse)
def update_onboarding(
    onboarding_data: schemas.UserOnboarding,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates user onboarding info."""
    updated_user = crud.update_user_onboarding(db, user, onboarding_data)
    updated_user.spotify_linked = bool(updated_user.spotify_id)
    return updated_user
