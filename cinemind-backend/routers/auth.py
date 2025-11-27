from fastapi import APIRouter, HTTPException

# Import clients and schemas from other files
from supabase_client import supabase, supabase_admin
from schemas import (
    User,
    UserCreate, 
    UserLogin, 
    EmailCheckRequest, 
    UsernameCheckRequest, 
    ResponseMessage, 
    TokenResponse
)

router = APIRouter(
    tags=["Authentication"]
)

@router.post("/auth/check-email", response_model=ResponseMessage)
def check_email_duplication(request: EmailCheckRequest):
    try:
        response = supabase_admin.table('profiles').select('email').eq('email', request.email).execute()
        if response.data:
            raise HTTPException(status_code=409, detail="이미 사용중인 이메일입니다.")
        return {"message": "사용 가능한 이메일입니다."}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

@router.post("/auth/check-username", response_model=ResponseMessage)
def check_username_duplication(request: UsernameCheckRequest):
    try:
        response = supabase_admin.table('profiles').select('username').eq('username', request.username).execute()
        if response.data:
            raise HTTPException(status_code=409, detail="이미 사용중인 아이디입니다.")
        return {"message": "사용 가능한 아이디입니다."}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

@router.post("/signup", response_model=ResponseMessage)
def signup(user: UserCreate):
    try:
        auth_response = supabase.auth.sign_up({"email": user.email, "password": user.password})
        if auth_response.user:
            profile_data = {"id": auth_response.user.id, "username": user.username, "email": user.email}
            supabase_admin.table("profiles").insert(profile_data).execute()
            
            # 온보딩에서 '좋아요'한 영화가 있는 경우, 출처를 'onboarding'으로 명시하고 중립 평점(3점)으로 저장
            if user.liked_movie_ids and auth_response.user:
                ratings_to_insert = [
                    {
                        "user_id": auth_response.user.id, 
                        "movie_id": str(movie_id), 
                        "rating": 3, # 중립적인 평점
                        "source": "onboarding" # 출처 명시
                    }
                    for movie_id in user.liked_movie_ids
                ]
                supabase_admin.table("user_ratings").insert(ratings_to_insert).execute()
        else:
            raise HTTPException(status_code=400, detail="Supabase 사용자 생성 실패")
    except Exception as e:
        error_message = str(e)
        if "User already registered" in error_message:
            raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")
        if "violates row-level security policy" in error_message:
            raise HTTPException(status_code=500, detail="데이터베이스 보안 정책 오류. Supabase RLS 설정을 확인하세요.")
        if "duplicate key value violates unique constraint" in error_message and "profiles_username_key" in error_message:
            raise HTTPException(status_code=409, detail="이미 사용중인 아이디입니다.")
        raise HTTPException(status_code=500, detail=f"서버 오류: {error_message}")
    return {"message": f"{user.username}님, 회원가입에 성공했습니다."}

@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin):
    try:
        auth_response = supabase.auth.sign_in_with_password({"email": user.email, "password": user.password})
        if auth_response.session:
            user_id = auth_response.user.id
            profile_res = supabase_admin.table('profiles').select('username, email').eq('id', user_id).single().execute()
            user_profile = profile_res.data
            return TokenResponse(
                access_token=auth_response.session.access_token, 
                refresh_token=auth_response.session.refresh_token, 
                token_type="bearer", 
                user=User(**user_profile)
            )
        else:
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못되었습니다.")
    except Exception as e:
        if "Invalid login credentials" in str(e):
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못되었습니다.")
        raise HTTPException(status_code=400, detail=str(e))
