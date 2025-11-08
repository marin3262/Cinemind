# main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from typing import List

# Import clients and services
from supabase_client import supabase, supabase_admin
from kobis_service import get_daily_box_office, get_movie_details
from recommendation_service import get_recommendations_for_user

# --- Pydantic Models ---
class User(BaseModel): username: str; email: EmailStr
class UserCreate(User): password: str
class UserLogin(BaseModel): email: EmailStr; password: str
class EmailCheckRequest(BaseModel): email: EmailStr
class UsernameCheckRequest(BaseModel): username: str
class Movie(BaseModel): id: str; rank: int; title: str; release: str; audience: int
class MovieDetails(BaseModel): title: str; release: str; runtime: str; genres: List[str]; directors: List[str]; actors: List[str]; synopsis: str
class RatingCreate(BaseModel): movie_id: str; rating: int
class ResponseMessage(BaseModel): message: str
class TokenResponse(BaseModel): access_token: str; refresh_token: str; token_type: str; user: User

# --- FastAPI App ---
app = FastAPI()

# --- Auth Dependency ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user: raise Exception("No user found")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid credentials: {str(e)}")

# --- Endpoints ---
@app.get("/", response_model=ResponseMessage)
def read_root(): return {"message": "CineMind 백엔드 서버가 실행 중입니다!"}

@app.post("/auth/check-email", response_model=ResponseMessage)
def check_email_duplication(request: EmailCheckRequest):
    try:
        response = supabase_admin.table('profiles').select('email').eq('email', request.email).execute()
        if response.data: raise HTTPException(status_code=409, detail="이미 사용중인 이메일입니다.")
        return {"message": "사용 가능한 이메일입니다."}
    except HTTPException as e: raise e
    except Exception as e: raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

@app.post("/auth/check-username", response_model=ResponseMessage)
def check_username_duplication(request: UsernameCheckRequest):
    try:
        response = supabase_admin.table('profiles').select('username').eq('username', request.username).execute()
        if response.data: raise HTTPException(status_code=409, detail="이미 사용중인 아이디입니다.")
        return {"message": "사용 가능한 아이디입니다."}
    except HTTPException as e: raise e
    except Exception as e: raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

@app.post("/signup", response_model=ResponseMessage)
def signup(user: UserCreate):
    try:
        auth_response = supabase.auth.sign_up({"email": user.email, "password": user.password})
        if auth_response.user:
            profile_data = {"id": auth_response.user.id, "username": user.username, "email": user.email}
            supabase_admin.table("profiles").insert(profile_data).execute()
        else: raise HTTPException(status_code=400, detail="Supabase 사용자 생성 실패")
    except Exception as e:
        error_message = str(e)
        if "User already registered" in error_message: raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")
        if "violates row-level security policy" in error_message: raise HTTPException(status_code=500, detail="데이터베이스 보안 정책 오류. Supabase RLS 설정을 확인하세요.")
        if "duplicate key value violates unique constraint" in error_message and "profiles_username_key" in error_message: raise HTTPException(status_code=409, detail="이미 사용중인 아이디입니다.")
        raise HTTPException(status_code=500, detail=f"서버 오류: {error_message}")
    return {"message": f"{user.username}님, 회원가입에 성공했습니다."}

@app.post("/login", response_model=TokenResponse)
def login(user: UserLogin):
    try:
        auth_response = supabase.auth.sign_in_with_password({"email": user.email, "password": user.password})
        if auth_response.session:
            user_id = auth_response.user.id
            profile_res = supabase_admin.table('profiles').select('username, email').eq('id', user_id).single().execute()
            user_profile = profile_res.data
            return TokenResponse(access_token=auth_response.session.access_token, refresh_token=auth_response.session.refresh_token, token_type="bearer", user=user_profile)
        else: raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못되었습니다.")
    except Exception as e:
        if "Invalid login credentials" in str(e):
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못되었습니다.")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/movies/box-office", response_model=List[Movie])
def get_box_office_live():
    raw_movies = get_daily_box_office()
    if raw_movies is None: raise HTTPException(status_code=500, detail="KOBIS API에서 데이터를 가져오는 데 실패했습니다.")
    return [Movie(id=m.get('movieCd'), rank=int(m.get('rank')), title=m.get('movieNm'), release=m.get('openDt'), audience=int(m.get('audiAcc'))) for m in raw_movies]

@app.get("/movies/{movie_cd}", response_model=MovieDetails)
def get_movie_detail_by_cd(movie_cd: str):
    details = get_movie_details(movie_cd)
    if not details: raise HTTPException(status_code=404, detail="영화 정보를 찾을 수 없습니다.")
    return MovieDetails(title=details.get('movieNm'), release=details.get('openDt'), runtime=details.get('showTm'), genres=[g['genreNm'] for g in details.get('genres', [])], directors=[d['peopleNm'] for d in details.get('directors', [])], actors=[a['peopleNm'] for a in details.get('actors', [])[:5]], synopsis="줄거리 정보는 별도 수집이 필요합니다.")

@app.post("/ratings", response_model=ResponseMessage)
def create_or_update_rating(rating_data: RatingCreate, current_user: dict = Depends(get_current_user)):
    try:
        supabase_admin.table('user_ratings').upsert({'user_id': current_user.id, 'movie_id': rating_data.movie_id, 'rating': rating_data.rating}).execute()
        return {"message": "평점이 성공적으로 저장되었습니다."}
    except Exception as e: raise HTTPException(status_code=500, detail=f"평점 저장 중 오류 발생: {str(e)}")

@app.get("/movies/recommendations", response_model=List[Movie])
def get_live_recommendations(current_user: dict = Depends(get_current_user)):
    recommendations_raw = get_recommendations_for_user(current_user.id)
    if recommendations_raw is None: raise HTTPException(status_code=500, detail="추천을 생성하는 데 실패했습니다.")
    if isinstance(recommendations_raw, dict): return []
    return [Movie(id=m.get('movieCd'), rank=int(m.get('rank')), title=m.get('movieNm'), release=m.get('openDt'), audience=int(m.get('audiAcc'))) for m in recommendations_raw]
