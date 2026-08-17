from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import requests
import urllib.parse
import base64

from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# The scopes required for Web Playback SDK and controlling playback
SPOTIFY_SCOPES = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state"

@router.get("/login")
async def login():
    """Redirects the user to Spotify's authorization page."""
    if not settings.spotify_client_id:
        raise HTTPException(status_code=500, detail="SPOTIFY_CLIENT_ID is not configured.")
        
    auth_url = "https://accounts.spotify.com/authorize"
    params = {
        "response_type": "code",
        "client_id": settings.spotify_client_id,
        "scope": SPOTIFY_SCOPES,
        "redirect_uri": settings.spotify_redirect_uri,
        # In a real app, generate a secure random state and store it in a session/cookie to verify in callback
        "state": "overworld_state_123" 
    }
    url = f"{auth_url}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/callback")
async def callback(code: str, state: str = None, error: str = None):
    """Handles the callback from Spotify, exchanges code for token, and redirects to frontend."""
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
    
    # Redirect back to the frontend with the tokens in the hash URL
    # Assuming frontend runs on Vite default port 5173
    frontend_redirect_url = f"{settings.frontend_url}/#access_token={access_token}&refresh_token={refresh_token}"
    return RedirectResponse(url=frontend_redirect_url)


class RefreshRequest(BaseModel):
    refresh_token: str

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
