from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from supabase_client import supabase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise Exception("No user found for the provided token")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid credentials: {str(e)}")

async def get_current_user_optional(token: str = Depends(oauth2_scheme)):
    if token is None:
        return None
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user
    except Exception:
        return None
