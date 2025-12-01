from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List

# 서비스, 스키마, 인증 핸들러 및 DB 클라이언트 임포트
from recommendation_service import get_home_hybrid_recommendations
from auth_handler import get_current_user
from supabase_client import supabase_admin
from schemas import TrendingMovie

router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
)

@router.get("/mood", response_model=List[TrendingMovie])
async def get_mood_recommendations(
    current_user: dict = Depends(get_current_user),
    mood_keywords: str = ""
):
    """
    사용자의 취향과 현재 기분을 모두 고려하여 개인화된 영화 목록을 추천합니다.
    mood_keywords가 없으면, 사용자 취향 기반의 일반 추천을 반환합니다.
    """
    keywords = [keyword.strip() for keyword in mood_keywords.split(',') if keyword.strip()]
    
    # 이제 서비스에서 영화의 상세 정보가 포함된 리스트를 직접 받음
    recommended_movies = await get_home_hybrid_recommendations(
        user_id=current_user.id, 
        mood_keywords=keywords
    )
    
    if not recommended_movies:
        return []

    # Pydantic 모델로 변환하여 반환
    try:
        final_movies = [
            TrendingMovie(
                id=movie['id'],
                title=movie['title'],
                poster_url=movie.get('poster_url'),
                release_date=movie.get('release_date'),
                overview=movie.get('overview'),
                vote_average=movie.get('vote_average'),
                recommendation_reason=movie.get('recommendation_reason')
            ) for movie in recommended_movies
        ]
        return final_movies
    except Exception as e:
        print(f"Pydantic 모델 변환 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="추천 영화 데이터를 처리하는 중 오류가 발생했습니다.")
