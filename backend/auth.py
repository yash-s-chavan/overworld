from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import requests
import urllib.parse
import base64
from sqlalchemy.orm import Session
from database import get_db

import crud
import schemas
from users import get_current_user
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

SPOTIFY_SCOPES = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state"

@router.post("/register")
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, user_data.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    user = crud.create_local_user(db, user_data.username, user_data.password)
    return {"session_token": user.session_token}

@router.post("/login/local")
def login_local(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, user_data.username, user_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"session_token": user.session_token}


@router.get("/login")
async def login(session_token: str = None):
    if not settings.spotify_client_id:
        raise HTTPException(status_code=500, detail="SPOTIFY_CLIENT_ID is not configured.")
        
    auth_url = "https://accounts.spotify.com/authorize"
    params = {
        "response_type": "code",
        "client_id": settings.spotify_client_id,
        "scope": SPOTIFY_SCOPES,
        "redirect_uri": settings.spotify_redirect_uri,
        "state": session_token or "overworld_state_123" 
    }
    url = f"{auth_url}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/callback")
async def callback(code: str, state: str = None, error: str = None, db: Session = Depends(get_db)):
    if error:
        raise HTTPException(status_code=400, detail=f"Spotify auth error: {error}")
        
    token_url = "https://accounts.spotify.com/api/token"
    
    auth_header = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()
    ).decode()
    
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.spotify_redirect_uri
    }
    
    response = requests.post(token_url, headers=headers, data=data)
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch token: {response.text}")
        
    token_data = response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    
    # fetch user profile
    profile_response = requests.get("https://api.spotify.com/v1/me", headers={"Authorization": f"Bearer {access_token}"})
    if profile_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Spotify profile")
    profile = profile_response.json()
    
    if state and state != "overworld_state_123":
        user = crud.get_user_by_session(db, state)
        if user:
            user.spotify_id = profile.get("id")
            user.spotify_access_token = access_token
            user.spotify_refresh_token = refresh_token
            user.display_name = profile.get("display_name")
            user.email = profile.get("email")
            images = profile.get("images", [])
            if images:
                user.avatar_url = images[0].get("url")
            db.commit()

    frontend_redirect_url = f"{settings.frontend_url}/#spotify_linked=true"
    return RedirectResponse(url=frontend_redirect_url)


class RefreshRequest(BaseModel):
    refresh_token: str

@router.get("/spotify/token")
def get_spotify_token(user = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.spotify_access_token:
        raise HTTPException(status_code=400, detail="Spotify not linked")
    
    # test if token works
    test_res = requests.get("https://api.spotify.com/v1/me", headers={"Authorization": f"Bearer {user.spotify_access_token}"})
    if test_res.status_code == 401:
        # try refresh
        if not user.spotify_refresh_token:
            raise HTTPException(status_code=401, detail="No refresh token")
        token_url = "https://accounts.spotify.com/api/token"
        auth_header = base64.b64encode(f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "grant_type": "refresh_token",
            "refresh_token": user.spotify_refresh_token
        }
        response = requests.post(token_url, headers=headers, data=data)
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to refresh Spotify token")
        token_data = response.json()
        user.spotify_access_token = token_data.get("access_token")
        # some refresh requests also return a new refresh token
        if "refresh_token" in token_data:
            user.spotify_refresh_token = token_data.get("refresh_token")
        db.commit()

    return {"access_token": user.spotify_access_token}

@router.post("/refresh")
async def refresh_token(request: RefreshRequest):
    """Exchanges a refresh token for a new access token."""
    token_url = "https://accounts.spotify.com/api/token"
    
    auth_header = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()
    ).decode()
    
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    data = {
        "grant_type": "refresh_token",
        "refresh_token": request.refresh_token
    }
    
    response = requests.post(token_url, headers=headers, data=data)
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to refresh token")
        
    return response.json()
