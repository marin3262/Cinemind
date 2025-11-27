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
    mood_keywords: str = Query(..., description="쉼표로 구분된 기분 키워드(장르명 한글)"),
    current_user: dict = Depends(get_current_user)
):
    """
    사용자의 취향과 현재 기분을 모두 고려하여 개인화된 영화 목록을 추천합니다.
    """
    keywords = [keyword.strip() for keyword in mood_keywords.split(',') if keyword.strip()]
    
    if not keywords:
        raise HTTPException(status_code=400, detail="mood_keywords를 제공해야 합니다.")

    # 1. 하이브리드 추천 로직을 통해 영화 ID 목록을 받음
    recommended_ids = await get_home_hybrid_recommendations(
        user_id=current_user.id, 
        mood_keywords=keywords
    )
    
    if not recommended_ids:
        return []

    # 2. 받은 ID 목록으로 영화 상세 정보를 DB에서 조회
    try:
        movies_res = supabase_admin.table('movies').select(
            "id, title, poster_url, release_date, synopsis"
        ).in_('id', recommended_ids).execute()

        if not movies_res.data:
            return []

        # 3. 추천 순서를 유지하면서 결과를 재구성
        movies_dict = {str(m['id']): m for m in movies_res.data}
        
        ordered_movies_data = [movies_dict[rec_id] for rec_id in recommended_ids if rec_id in movies_dict]

        # Convert to the Pydantic model, mapping synopsis to overview
        final_movies = [
            TrendingMovie(
                id=movie['id'],
                title=movie['title'],
                poster_url=movie['poster_url'],
                release_date=movie.get('release_date'),
                overview=movie.get('synopsis'),
                vote_average=movie.get('vote_average')
            ) for movie in ordered_movies_data
        ]

        return final_movies

    except Exception as e:
        print(f"추천 영화 상세 정보 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="추천 영화 정보를 가져오는 중 오류가 발생했습니다.")
