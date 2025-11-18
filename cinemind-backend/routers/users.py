from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from collections import Counter
from datetime import datetime

from schemas import UserRatingWithMovie, UserActivityStatus, LikedMovie, TasteAnalysisReport
from auth_handler import get_current_user
from supabase_client import supabase_admin

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get("/me/ratings", response_model=List[UserRatingWithMovie])
def get_my_ratings(current_user: dict = Depends(get_current_user)):
    """
    현재 로그인한 사용자가 평가한 모든 영화의 목록을 가져옵니다.
    """
    try:
        # 1. Fetch all ratings for the current user
        user_id = current_user.id
        ratings_res = supabase_admin.table('user_ratings').select('movie_id, rating').eq('user_id', user_id).execute()
        
        if not ratings_res.data:
            return []

        user_ratings_map = {item['movie_id']: {'rating': item['rating']} for item in ratings_res.data}
        movie_ids = list(user_ratings_map.keys())

        # 2. Fetch details for the rated movies
        movies_res = supabase_admin.table('movies').select('id, title, poster_url').in_('id', movie_ids).execute()

        if not movies_res.data:
            return []

        # 3. Combine the results
        combined_list = []
        for movie in movies_res.data:
            movie_id = movie['id']
            if movie_id in user_ratings_map:
                combined_list.append(
                    UserRatingWithMovie(
                        movie_id=movie_id,
                        title=movie['title'],
                        poster_url=movie['poster_url'],
                        rating=user_ratings_map[movie_id]['rating']
                    )
                )
        
        return combined_list

    except Exception as e:
        print(f"Error fetching user ratings: {e}")
        raise HTTPException(status_code=500, detail="평점 목록을 가져오는 중 오류가 발생했습니다.")

@router.get("/me/likes", response_model=List[LikedMovie])
def get_my_likes(current_user: dict = Depends(get_current_user)):
    """
    현재 로그인한 사용자가 찜한 모든 영화의 목록을 가져옵니다.
    """
    try:
        # 1. Fetch all likes for the current user
        user_id = current_user.id
        likes_res = supabase_admin.table('user_likes').select('movie_id').eq('user_id', user_id).execute()
        
        if not likes_res.data:
            return []

        movie_ids = [item['movie_id'] for item in likes_res.data]

        # 2. Fetch details for the liked movies
        movies_res = supabase_admin.table('movies').select('id, title, poster_url').in_('id', movie_ids).execute()

        if not movies_res.data:
            return []

        # 3. Format the results
        liked_movies_list = [
            LikedMovie(
                movie_id=movie['id'],
                title=movie['title'],
                poster_url=movie['poster_url'],
            ) for movie in movies_res.data
        ]
        
        return liked_movies_list

    except Exception as e:
        print(f"Error fetching user likes: {e}")
        raise HTTPException(status_code=500, detail="찜한 목록을 가져오는 중 오류가 발생했습니다.")

@router.get("/me/taste-analysis", response_model=TasteAnalysisReport)
def get_taste_analysis(current_user: dict = Depends(get_current_user)):
    """
    현재 로그인한 사용자의 영화 취향을 분석하여 리포트를 반환합니다.
    """
    user_id = current_user.id
    all_movie_ids = set()

    try:
        # 1. 사용자가 평가한 영화 ID 수집
        ratings_res = supabase_admin.table('user_ratings').select('movie_id').eq('user_id', user_id).execute()
        for item in ratings_res.data:
            all_movie_ids.add(item['movie_id'])

        # 2. 사용자가 찜한 영화 ID 수집
        likes_res = supabase_admin.table('user_likes').select('movie_id').eq('user_id', user_id).execute()
        for item in likes_res.data:
            all_movie_ids.add(item['movie_id'])

        if not all_movie_ids:
            return TasteAnalysisReport(
                taste_title="아직 영화 취향을 분석할 데이터가 부족해요!",
                top_genres=[],
                preferred_era=None
            )

        # 3. 수집된 영화 ID로 영화 상세 정보(장르, 개봉일) 가져오기
        movies_res = supabase_admin.table('movies').select('id, genres, release_date').in_('id', list(all_movie_ids)).execute()
        
        if not movies_res.data:
            return TasteAnalysisReport(
                taste_title="아직 영화 취향을 분석할 데이터가 부족해요!",
                top_genres=[],
                preferred_era=None
            )

        genre_counter = Counter()
        era_counter = Counter()

        for movie in movies_res.data:
            # 장르 분석
            if movie.get('genres'):
                # genres 필드가 [{'genreNm': '액션'}, ...] 형태일 수 있음
                for genre_item in movie['genres']:
                    if isinstance(genre_item, dict) and 'genreNm' in genre_item:
                        genre_counter[genre_item['genreNm']] += 1
                    elif isinstance(genre_item, str): # 이미 문자열 리스트인 경우
                        genre_counter[genre_item] += 1

            # 시대 분석
            release_date_str = movie.get('release_date')
            if release_date_str and len(release_date_str) >= 4:
                try:
                    year = int(release_date_str[:4])
                    era = f"{(year // 10) * 10}년대"
                    era_counter[era] += 1
                except ValueError:
                    pass # 연도 파싱 오류 무시

        top_genres = [genre for genre, count in genre_counter.most_common(3)]
        preferred_era = era_counter.most_common(1)[0][0] if era_counter else None

        # 취향 타이틀 생성
        taste_title_parts = []
        if top_genres:
            taste_title_parts.append(f"{top_genres[0]} 영화를 좋아하는")
        if preferred_era:
            taste_title_parts.append(f"{preferred_era} 시네필")
        
        if not taste_title_parts:
            taste_title = "아직 영화 취향을 분석할 데이터가 부족해요!"
        else:
            taste_title = " ".join(taste_title_parts) + "님"

        return TasteAnalysisReport(
            taste_title=taste_title,
            top_genres=top_genres,
            preferred_era=preferred_era
        )

    except Exception as e:
        print(f"Error fetching taste analysis: {e}")
        raise HTTPException(status_code=500, detail="취향 분석 정보를 가져오는 중 오류가 발생했습니다.")