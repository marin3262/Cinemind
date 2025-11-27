from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from collections import Counter
from datetime import datetime

from schemas import UserRatingWithMovie, UserActivityStatus, LikedMovie, TasteAnalysisResponse, RatingDistributionItem, Person
from auth_handler import get_current_user
from supabase_client import supabase_admin
from kobis_service import search_person_by_name

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

@router.get("/me/taste-analysis", response_model=TasteAnalysisResponse)
def get_taste_analysis(current_user: dict = Depends(get_current_user)):
    """
    현재 로그인한 사용자의 영화 취향을 분석하여 리포트를 반환합니다.
    (선호 배우/감독 ID 조회 기능 추가)
    """
    user_id = current_user.id
    
    try:
        # 1. 사용자가 '평가'한 영화와 별점 정보 가져오기 (4점 이상)
        ratings_res = supabase_admin.table('user_ratings').select('movie_id, rating').eq('user_id', user_id).gte('rating', 4).execute()
        
        if not ratings_res.data or len(ratings_res.data) < 3:
            return TasteAnalysisResponse(
                total_ratings=len(ratings_res.data) if ratings_res.data else 0,
                analysis_title="아직 분석할 데이터가 부족해요!",
                top_genres=[],
                rating_distribution=[],
                top_actors=[],
                top_directors=[]
            )
        
        total_ratings = len(ratings_res.data)
        rated_movie_ids = [item['movie_id'] for item in ratings_res.data]

        # 2. 별점 분포도 분석
        full_ratings_res = supabase_admin.table('user_ratings').select('rating').eq('user_id', user_id).execute()
        rating_counts = Counter(item['rating'] for item in full_ratings_res.data)
        rating_distribution = [
            RatingDistributionItem(rating=r, count=rating_counts.get(r, 0))
            for r in range(1, 6)
        ]

        # 3. 평가한 영화들의 상세 정보(장르, 배우, 감독) 가져오기
        movies_res = supabase_admin.table('movies').select('genres, actors, directors').in_('id', rated_movie_ids).execute()
        
        if not movies_res.data:
             return TasteAnalysisResponse(
                total_ratings=total_ratings,
                analysis_title="취향을 분석하는 중이에요!",
                top_genres=[],
                rating_distribution=rating_distribution,
                top_actors=[],
                top_directors=[]
            )

        # 4. 장르, 배우, 감독 카운팅
        genre_counter = Counter()
        actor_counter = Counter()
        director_counter = Counter()

        for movie in movies_res.data:
            # 장르
            genres = movie.get('genres') or []
            for genre_item in genres:
                genre_name = genre_item.get('name') if isinstance(genre_item, dict) else genre_item
                if genre_name: genre_counter[genre_name] += 1
            
            # 배우
            actors = movie.get('actors') or []
            for actor_item in actors:
                actor_name = actor_item if isinstance(actor_item, str) else actor_item.get('name') if isinstance(actor_item, dict) else None
                if actor_name: actor_counter[actor_name] += 1
                
            # 감독
            directors = movie.get('directors') or []
            for director_item in directors:
                director_name = director_item if isinstance(director_item, str) else director_item.get('name') if isinstance(director_item, dict) else None
                if director_name: director_counter[director_name] += 1

        top_genres = [genre for genre, count in genre_counter.most_common(3)]
        top_actors_names = [actor for actor, count in actor_counter.most_common(5)]
        top_directors_names = [director for director, count in director_counter.most_common(3)]
        
        # 5. 이름으로 ID 조회 (매우 비효율적, 추후 개선 필요)
        top_actors_with_id = []
        for name in top_actors_names:
            person_id = search_person_by_name(name)
            if person_id:
                top_actors_with_id.append(Person(id=person_id, name=name))

        top_directors_with_id = []
        for name in top_directors_names:
            person_id = search_person_by_name(name)
            if person_id:
                top_directors_with_id.append(Person(id=person_id, name=name))

        # 6. 취향 타이틀 생성
        analysis_title = "당신은 진정한 시네필!" # 기본값
        if top_genres:
            analysis_title = f"'{top_genres[0]}' 장르를 사랑하는"
            if top_actors_names:
                analysis_title += f", '{top_actors_names[0]}'의 팬"
        
        return TasteAnalysisResponse(
            total_ratings=total_ratings,
            analysis_title=analysis_title,
            top_genres=top_genres,
            rating_distribution=rating_distribution,
            top_actors=top_actors_with_id,
            top_directors=top_directors_with_id,
        )

    except Exception as e:
        print(f"Error fetching taste analysis: {e}")
        raise HTTPException(status_code=500, detail="취향 분석 정보를 가져오는 중 오류가 발생했습니다.")