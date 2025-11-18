import os
import requests
import json
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query

# Import services, clients, schemas, and handlers
from supabase_client import supabase_admin
from kobis_service import get_daily_box_office, get_movie_details
from recommendation_service import get_recommendations_for_user
from tmdb_service import (
    search_movie_by_title, get_movie_poster_path, get_full_poster_url, 
    get_movies_for_onboarding, get_details_for_movies, get_trending_movies,
    get_now_playing_movies, get_top_rated_movies, get_movie_details_by_tmdb_id,
    get_movies_by_genre, GENRE_IDS, search_movies_by_query
)
from feature_service import extract_features_from_tmdb_details
from .user_interactions import get_user_activity_for_movie # Import from local router
from schemas import (
    Movie, MovieDetails, OnboardingMovie, MovieIdList, TrendingMovie, Genre
)
from auth_handler import get_current_user, get_current_user_optional
from llm_service import get_emotional_tags_for_movie

import random

router = APIRouter(
    tags=["Movies & Recommendations"]
)

@router.get("/movies/all-random", response_model=List[Movie])
async def get_all_random_movies(page: int = 1, limit: int = 20):
    """
    DB에 저장된 모든 영화를 무작위 순서로 반환합니다. 페이지네이션을 지원합니다.
    """
    try:
        # Get total number of movies with a poster_url
        count_res = supabase_admin.table('movies').select('id', count='exact').not_.is_('poster_url', 'null').execute()
        total_count = count_res.count
        
        if total_count == 0:
            return []

        # To ensure different results per page, we use the page number to seed the random generator
        # This makes the "random" order stable for a given page number
        random.seed(page)
        
        # Generate a list of all possible offsets and shuffle it
        all_offsets = list(range(0, total_count, limit))
        random.shuffle(all_offsets)
        
        # Pick an offset for the current page. If page is out of bounds, it will wrap around.
        offset = all_offsets[(page - 1) % len(all_offsets)]

        movies_res = supabase_admin.table('movies').select('id, title, release_date, poster_url').not_.is_('poster_url', 'null').limit(limit).offset(offset).execute()

        if not movies_res.data:
            return []

        # Format into Movie model, rank/audience are not relevant here
        random_movies = [
            Movie(
                id=str(movie['id']),
                title=movie.get('title', 'N/A'),
                release=movie.get('release_date', ''),
                poster_url=movie.get('poster_url'),
                rank=0, audience=0, daily_audience=0
            ) for movie in movies_res.data
        ]
        return random_movies

    except Exception as e:
        print(f"랜덤 영화 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="랜덤 영화 목록을 가져오는 데 실패했습니다.")

@router.get("/genres", response_model=List[Genre])
async def get_genres():
    """
    TMDB에서 사용 가능한 영화 장르 목록을 가져옵니다.
    """
    return [{"id": genre_id, "name": genre_name} for genre_name, genre_id in GENRE_IDS.items()]

@router.get("/movies/search", response_model=List[TrendingMovie])
async def search_movies(query: str = Query(..., min_length=1, description="검색할 영화 제목")):
    """
    TMDB에서 영화를 검색합니다.
    """
    if not query:
        return []
    movies = await search_movies_by_query(query)
    if not movies:
        return []
    return movies

@router.get("/movies/trending", response_model=List[TrendingMovie])
async def get_trending(page: int = 1):
    """
    주간 트렌딩 영화 목록을 가져옵니다. 페이지네이션을 지원합니다.
    """
    list_type = "trending_movies"
    cache_expiration_hours = 6

    # Only check cache for the first page
    if page == 1:
        try:
            cached_data_res = supabase_admin.table('cached_lists').select('*').eq('list_type', list_type).single().execute()
            cached_entry = cached_data_res.data

            if cached_entry:
                last_updated_str = cached_entry['last_updated'].replace('Z', '+0000')
                if '+' in last_updated_str and last_updated_str[-3] == ':':
                    last_updated_str = last_updated_str[:-3] + last_updated_str[-2:]
                
                try:
                    last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S.%f%z')
                except ValueError:
                    last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S%z')

                if last_updated_dt > datetime.now(last_updated_dt.tzinfo) - timedelta(hours=cache_expiration_hours):
                    return json.loads(cached_entry['data'])
        except Exception as e:
            if "PGRST116" not in str(e):
                 print(f"Error checking cache for {list_type}: {e}")

    # Fetch from service for any page
    movies = await get_trending_movies(page=page)
    if not movies:
        # For pages > 1, returning empty is fine. For page 1, it might be an error.
        if page == 1:
            raise HTTPException(status_code=500, detail="트렌딩 영화 목록을 가져오는 데 실패했습니다.")
        return []

    # Only cache the first page
    if page == 1:
        try:
            supabase_admin.table('cached_lists').upsert(
                {"list_type": list_type, "data": json.dumps(movies), "last_updated": datetime.now().isoformat()},
                on_conflict='list_type'
            ).execute()
        except Exception as e:
            print(f"Error caching data for {list_type}: {e}")

    return movies

@router.get("/movies/now_playing", response_model=List[TrendingMovie])
async def get_now_playing(page: int = 1):
    """
    현재 상영중인 영화 목록을 가져옵니다. 페이지네이션을 지원합니다.
    """
    list_type = "now_playing_movies"
    cache_expiration_hours = 6

    if page == 1:
        try:
            cached_data_res = supabase_admin.table('cached_lists').select('*').eq('list_type', list_type).single().execute()
            cached_entry = cached_data_res.data

            if cached_entry:
                last_updated_str = cached_entry['last_updated'].replace('Z', '+0000')
                if '+' in last_updated_str and last_updated_str[-3] == ':':
                    last_updated_str = last_updated_str[:-3] + last_updated_str[-2:]
                
                try:
                    last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S.%f%z')
                except ValueError:
                    last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S%z')

                if last_updated_dt > datetime.now(last_updated_dt.tzinfo) - timedelta(hours=cache_expiration_hours):
                    return json.loads(cached_entry['data'])
        except Exception as e:
            if "PGRST116" not in str(e):
                print(f"Error checking cache for {list_type}: {e}")

    movies = await get_now_playing_movies(page=page)
    if not movies:
        if page == 1:
            raise HTTPException(status_code=500, detail="현재 상영중인 영화 목록을 가져오는 데 실패했습니다.")
        return []

    if page == 1:
        try:
            supabase_admin.table('cached_lists').upsert(
                {"list_type": list_type, "data": json.dumps(movies), "last_updated": datetime.now().isoformat()},
                on_conflict='list_type'
            ).execute()
        except Exception as e:
            print(f"Error caching data for {list_type}: {e}")

    return movies

@router.get("/movies/top_rated", response_model=List[TrendingMovie])
async def get_top_rated(page: int = 1):
    """
    평점 높은 영화 목록을 가져옵니다. 페이지네이션을 지원합니다.
    """
    list_type = "top_rated_movies"
    cache_expiration_hours = 6

    if page == 1:
        try:
            cached_data_res = supabase_admin.table('cached_lists').select('*').eq('list_type', list_type).single().execute()
            cached_entry = cached_data_res.data

            if cached_entry:
                last_updated_str = cached_entry['last_updated'].replace('Z', '+0000')
                if '+' in last_updated_str and last_updated_str[-3] == ':':
                    last_updated_str = last_updated_str[:-3] + last_updated_str[-2:]
                
                try:
                    last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S.%f%z')
                except ValueError:
                    last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S%z')

                if last_updated_dt > datetime.now(last_updated_dt.tzinfo) - timedelta(hours=cache_expiration_hours):
                    return json.loads(cached_entry['data'])
        except Exception as e:
            if "PGRST116" not in str(e):
                print(f"Error checking cache for {list_type}: {e}")

    movies = await get_top_rated_movies(page=page)
    if not movies:
        if page == 1:
            raise HTTPException(status_code=500, detail="평점 높은 영화 목록을 가져오는 데 실패했습니다.")
        return []

    if page == 1:
        try:
            supabase_admin.table('cached_lists').upsert(
                {"list_type": list_type, "data": json.dumps(movies), "last_updated": datetime.now().isoformat()},
                on_conflict='list_type'
            ).execute()
        except Exception as e:
            print(f"Error caching data for {list_type}: {e}")

    return movies

@router.get("/movies/genre/{genre_id}", response_model=List[TrendingMovie])
async def get_movies_by_genre_endpoint(genre_id: int, page: int = 1):
    """
    특정 장르의 영화 목록을 가져옵니다. 페이지네이션을 지원합니다.
    """
    list_type = f"genre_{genre_id}_movies"
    cache_expiration_hours = 24

    if page == 1:
        try:
            cached_data_res = supabase_admin.table('cached_lists').select('*').eq('list_type', list_type).single().execute()
            cached_entry = cached_data_res.data

            if cached_entry:
                last_updated_str = cached_entry['last_updated'].replace('Z', '+0000')
                if '+' in last_updated_str and last_updated_str[-3] == ':':
                    last_updated_str = last_updated_str[:-3] + last_updated_str[-2:]
                
                try:
                    last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S.%f%z')
                except ValueError:
                    last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S%z')

                if last_updated_dt > datetime.now(last_updated_dt.tzinfo) - timedelta(hours=cache_expiration_hours):
                    return json.loads(cached_entry['data'])
        except Exception as e:
            if "PGRST116" not in str(e):
                print(f"Error checking cache for {list_type}: {e}")

    movies = await get_movies_by_genre(genre_id=genre_id, page=page)
    if not movies:
        return []

    if page == 1:
        try:
            supabase_admin.table('cached_lists').upsert(
                {"list_type": list_type, "data": json.dumps(movies), "last_updated": datetime.now().isoformat()},
                on_conflict='list_type'
            ).execute()
        except Exception as e:
            print(f"Error caching data for {list_type}: {e}")

    return movies

@router.get("/movies/onboarding", response_model=List[OnboardingMovie])
async def get_onboarding_movies(mood: str | None = Query(None)):
    movies = await get_movies_for_onboarding(mood=mood)
    if not movies:
        raise HTTPException(status_code=500, detail="온보딩 영화 목록을 가져오는 데 실패했습니다.")
    return movies

@router.post("/movies/details", response_model=List[OnboardingMovie])
async def get_movies_by_ids(id_list: MovieIdList):
    movies = await get_details_for_movies(id_list.ids)
    if not movies:
        raise HTTPException(status_code=404, detail="요청한 ID에 해당하는 영화를 찾을 수 없습니다.")
    return movies

@router.get("/movies/box-office", response_model=List[Movie])
def get_box_office_live(sort_by: str = Query("rank", enum=["rank", "audience"])):
    raw_movies_kobis = get_daily_box_office()
    if raw_movies_kobis is None:
        return []
    
    movie_ids_kobis = [m.get('movieCd') for m in raw_movies_kobis]
    
    try:
        cached_movies_res = supabase_admin.table('movies').select('*').in_('id', movie_ids_kobis).execute()
        cached_movies_dict = {m['id']: m for m in cached_movies_res.data}
    except Exception as e:
        print(f"DB에서 캐시된 영화 조회 중 오류: {e}")
        cached_movies_dict = {}

    enriched_movies = []
    movies_to_upsert = []

    for m in raw_movies_kobis:
        movie_id = m.get('movieCd')
        cached_movie = cached_movies_dict.get(movie_id)
        
        is_cache_valid = False
        if cached_movie and cached_movie.get('poster_url'):
            last_updated_str = cached_movie['last_updated'].replace('Z', '+0000')
            if '+' in last_updated_str and last_updated_str[-3] == ':':
                last_updated_str = last_updated_str[:-3] + last_updated_str[-2:]
            
            try:
                last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S.%f%z')
                is_cache_valid = last_updated_dt > datetime.now(last_updated_dt.tzinfo) - timedelta(hours=6)
            except ValueError:
                last_updated_dt = datetime.strptime(last_updated_str, '%Y-%m-%dT%H:%M:%S%z')
                is_cache_valid = last_updated_dt > datetime.now(last_updated_dt.tzinfo) - timedelta(hours=6)

        cumulative_audience = int(m.get('audiAcc', 0))
        daily_audience = int(m.get('audiCnt', 0))

        if is_cache_valid:
            enriched_movies.append(
                Movie(id=movie_id, rank=int(m.get('rank')), title=cached_movie.get('title'), release=cached_movie.get('release_date'), audience=cumulative_audience, daily_audience=daily_audience, poster_url=cached_movie.get('poster_url'))
            )
        else:
            title = m.get('movieNm')
            release_year = m.get('openDt')[:4] if m.get('openDt') else None
            
            poster_url = None
            tmdb_movie_data = search_movie_by_title(title, release_year)
            if tmdb_movie_data:
                tmdb_id = tmdb_movie_data.get('id')
                poster_path = get_movie_poster_path(tmdb_id)
                poster_url = get_full_poster_url(poster_path)

            movie_to_cache = {"id": movie_id, "title": title, "release_date": m.get('openDt') if m.get('openDt') else None, "poster_url": poster_url}
            movies_to_upsert.append(movie_to_cache)

            enriched_movies.append(
                Movie(id=movie_id, rank=int(m.get('rank')), title=title, release=m.get('openDt'), audience=cumulative_audience, daily_audience=daily_audience, poster_url=poster_url)
            )

    if movies_to_upsert:
        try:
            supabase_admin.table('movies').upsert(movies_to_upsert).execute()
        except Exception as e:
            print(f"DB에 영화 정보 업데이트 중 오류: {e}")

    if sort_by == "rank":
        enriched_movies.sort(key=lambda x: x.rank)
    elif sort_by == "audience":
        enriched_movies.sort(key=lambda x: x.audience, reverse=True)
    
    return enriched_movies

@router.get("/movies/recommendations", response_model=List[Movie])
async def get_live_recommendations(current_user: dict | None = Depends(get_current_user_optional), mood_tag: Optional[str] = Query(None, description="Filter recommendations by mood tag (e.g., 'happy', 'sad')")):
    # Use a default user ID for testing in bypass mode if no user is logged in
    user_id_to_recommend = "15a455ab-308f-4b93-af6d-96de3dab8caf"
    if current_user:
        user_id_to_recommend = current_user.id

    recommendation_result = await get_recommendations_for_user(user_id=user_id_to_recommend, mood_tag=mood_tag)
    
    if recommendation_result is None:
        raise HTTPException(status_code=500, detail="추천을 생성하는 데 실패했습니다.")
    
    if isinstance(recommendation_result, dict):
        print(f"Could not generate recommendations for user {user_id_to_recommend}: {recommendation_result.get('message')}")
        return []

    recommended_ids = recommendation_result
    if not recommended_ids:
        return []

    try:
        movies_res = supabase_admin.table('movies').select('*').in_('id', recommended_ids).execute()
        if not movies_res.data:
            return []

        recommended_movies = []
        movies_to_backfill = []

        for movie_data in movies_res.data:
            if not movie_data.get('poster_url'):
                print(f"포스터 정보가 없는 영화 발견 (ID: {movie_data['id']}). TMDB에서 정보를 가져옵니다.")
                try:
                    tmdb_id = int(movie_data['id'])
                    details = await get_movie_details_by_tmdb_id(tmdb_id)
                    if details and details.get('poster_url'):
                        movie_data['poster_url'] = details.get('poster_url')
                        movie_data['genres'] = details.get('genres')
                        movies_to_backfill.append({"id": str(tmdb_id), "poster_url": details.get('poster_url'), "genres": details.get('genres')})
                except (ValueError, TypeError):
                    print(f"ID {movie_data['id']}는 TMDB ID가 아니므로 스킵합니다.")
                except Exception as e:
                    print(f"TMDB에서 ID {movie_data['id']}의 정보 가져오기 실패: {e}")

            movie_id_str = str(movie_data.get('id'))
            recommended_movies.append(
                Movie(id=movie_id_str, rank=recommended_ids.index(movie_id_str) + 1 if movie_id_str in recommended_ids else 99, title=movie_data.get('title', 'N/A'), release=movie_data.get('release_date', ''), audience=0, daily_audience=0, poster_url=movie_data.get('poster_url'))
            )
        
        if movies_to_backfill:
            print(f"{len(movies_to_backfill)}개의 영화 정보를 DB에 보강합니다.")
            supabase_admin.table('movies').upsert(movies_to_backfill).execute()

        recommended_movies.sort(key=lambda x: x.rank)
        return recommended_movies

    except Exception as e:
        print(f"추천 영화 상세 정보 처리 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="추천 영화 정보를 가져오는 데 실패했습니다.")

@router.get("/movies/{movie_id}/similar", response_model=List[Movie])
async def get_content_similar_movies(movie_id: str):
    """
    주어진 영화와 내용이 유사한 영화 목록을 반환합니다.
    """
    try:
        # 1. Load content-based similarity data
        content_sim_res = supabase_admin.table('cached_lists').select('data').eq('list_type', "content_similar_top_k").single().execute()
        if not content_sim_res.data or not content_sim_res.data.get('data'):
            print("콘텐츠 기반 유사도 데이터가 캐시에 없습니다.")
            return []
        
        content_similarities = json.loads(content_sim_res.data['data'])
        
        # 2. Get similar movie IDs for the given movie_id
        similar_movies_data = content_similarities.get(str(movie_id))
        if not similar_movies_data:
            print(f"ID {movie_id}에 대한 유사 영화를 찾을 수 없습니다.")
            return []
            
        # Sort by score and get IDs
        similar_movies_data.sort(key=lambda x: x['score'], reverse=True)
        similar_movie_ids = [item['id'] for item in similar_movies_data]

        if not similar_movie_ids:
            return []

        # 3. Fetch details for these movies
        movies_res = supabase_admin.table('movies').select('id, title, release_date, poster_url').in_('id', similar_movie_ids).execute()
        if not movies_res.data:
            return []
            
        # 4. Create a dictionary for quick lookups and preserving order
        movies_dict = {str(m['id']): m for m in movies_res.data}
        
        # 5. Build the final list in the order of similarity
        ordered_similar_movies = []
        for sim_id in similar_movie_ids:
            movie_data = movies_dict.get(str(sim_id))
            if movie_data:
                ordered_similar_movies.append(
                    Movie(
                        id=str(movie_data['id']),
                        title=movie_data.get('title', 'N/A'),
                        release=movie_data.get('release_date', ''),
                        poster_url=movie_data.get('poster_url'),
                        rank=0, audience=0, daily_audience=0 # Not applicable here
                    )
                )
        
        return ordered_similar_movies

    except Exception as e:
        # Handle cases where .single() fails if data is not present
        if "PGRST116" in str(e):
            print("콘텐츠 기반 유사도 데이터가 캐시에 없습니다.")
            return []
        print(f"유사 영화 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="유사 영화를 가져오는 데 실패했습니다.")

@router.get("/movies/tmdb/{tmdb_id}", response_model=MovieDetails)
async def get_movie_detail_by_tmdb_id(tmdb_id: int, current_user: dict | None = Depends(get_current_user_optional)):
    print("--- 상세 정보 조회 시작 (TMDB ID) ---")
    print(f"요청된 영화 ID (tmdb_id): {tmdb_id}")

    details = await get_movie_details_by_tmdb_id(tmdb_id)
    if not details:
        raise HTTPException(status_code=404, detail="TMDB에서 영화 정보를 찾을 수 없습니다.")

    try:
        movie_id_str = str(tmdb_id)
        
        # 1. Extract features using the new service
        additional_features = extract_features_from_tmdb_details(details)
        
        # 2. Prepare data for caching, including new features
        movie_to_cache = {
            "id": movie_id_str, 
            "title": details.get("title"), 
            "release_date": details.get("release"), 
            "poster_url": details.get("poster_url"), 
            "genres": details.get("genres"),
            "synopsis": details.get("synopsis"),
            "runtime": details.get("runtime"),
            "backdrop_url": details.get("backdrop_url"),
            **additional_features # Add new features (keywords, director, actors)
        }
        
        # 3. Upsert to DB
        supabase_admin.table('movies').upsert(movie_to_cache).execute()
        print(f"TMDB 영화 (ID: {tmdb_id}) 정보를 로컬 DB에 저장/업데이트했습니다.")

        try:
            # This part for emotional_tags can be refactored or merged later if needed
            existing_movie_res = supabase_admin.table("movies").select("emotional_tags").eq("id", movie_id_str).single().execute()
            if not existing_movie_res.data.get("emotional_tags"):
                print(f"'{details.get('title')}' 영화의 감성 태그를 생성합니다.")
                emotional_tags = get_emotional_tags_for_movie(details.get("title"))
                supabase_admin.table("movies").update({"emotional_tags": emotional_tags}).eq("id", movie_id_str).execute()
                details['emotional_tags'] = emotional_tags
                print(f"감성 태그 저장 완료: {emotional_tags}")
        except Exception as e:
            if "PGRST116" in str(e): # If row doesn't exist
                print(f"'{details.get('title')}' 영화의 감성 태그를 생성합니다.")
                emotional_tags = get_emotional_tags_for_movie(details.get("title"))
                supabase_admin.table("movies").update({"emotional_tags": emotional_tags}).eq("id", movie_id_str).execute()
                details['emotional_tags'] = emotional_tags
                print(f"감성 태그 저장 완료: {emotional_tags}")
            else:
                print(f"감성 태그 생성/저장 중 오류 발생: {e}")

    except Exception as e:
        print(f"DB에 영화 정보 저장 중 오류 발생: {e}")

    user_rating = None
    is_liked = False
    if current_user:
        print(f"로그인된 사용자 ID: {current_user.id}")
        movie_id_str = str(tmdb_id)
        print(f"활동 상태 조회를 위한 영화 ID: {movie_id_str}")
        try:
            activity_status = get_user_activity_for_movie(movie_id=movie_id_str, current_user=current_user)
            user_rating = activity_status.user_rating
            is_liked = activity_status.is_liked
            details['comment'] = activity_status.comment
        except Exception as e:
            print(f"활동 상태 조회 중 예외 발생: {e}")
            pass
    else:
        print("로그인되지 않은 사용자입니다.")
    
    details['user_rating'] = user_rating
    details['is_liked'] = is_liked
    return details

@router.get("/movies/{movie_id}", response_model=MovieDetails)
async def get_movie_detail_by_id(movie_id: str, current_user: dict | None = Depends(get_current_user_optional)):
    """
    지능적으로 KOBIS 또는 TMDB ID를 처리하여 영화 상세 정보를 반환합니다.
    """
    print(f"--- 상세 정보 조회 시작 (통합 ID: {movie_id}) ---")

    user_rating, user_comment, is_liked = None, None, False
    if current_user:
        try:
            activity_status = get_user_activity_for_movie(movie_id=movie_id, current_user=current_user)
            user_rating, user_comment, is_liked = activity_status.user_rating, activity_status.comment, activity_status.is_liked
        except Exception as e:
            print(f"활동 상태 조회 중 예외 발생 (정상일 수 있음): {e}")

    try:
        cached_movie_res = supabase_admin.table('movies').select('*').eq('id', movie_id).single().execute()
        cached_movie = cached_movie_res.data
        
        if cached_movie:
            print(f"ID {movie_id}에 대한 캐시를 찾았습니다. 데이터 형식을 검증하고 반환합니다.")
            
            # Ensure list types are not None
            cached_movie['directors'] = cached_movie.get('directors') or []
            cached_movie['actors'] = cached_movie.get('actors') or []
            
            # Transform genres if they are in dict format
            genres = cached_movie.get('genres') or []
            if genres and isinstance(genres[0], dict):
                if 'name' in genres[0]:
                    cached_movie['genres'] = [g['name'] for g in genres]
                elif 'genreNm' in genres[0]:
                    cached_movie['genres'] = [g['genreNm'] for g in genres]
            
            cached_movie.update({'user_rating': user_rating, 'is_liked': is_liked, 'comment': user_comment})
            return MovieDetails(**cached_movie)

    except Exception as e:
        if "PGRST116" not in str(e):
            print(f"DB 캐시 조회 중 오류: {e}")
        # Proceed to fetch from APIs if not in cache

    if len(movie_id) > 7:
        print(f"ID {movie_id}를 KOBIS ID로 간주하고 조회합니다.")
        kobis_details = get_movie_details(movie_id)
        if kobis_details and kobis_details.get('movieNm'):
            print("KOBIS에서 정보를 찾았습니다. TMDB 정보로 보강합니다.")
            
            title = kobis_details.get('movieNm')
            release_year = kobis_details.get('openDt')[:4] if kobis_details.get('openDt') else None
            poster_url, backdrop_url, synopsis = None, None, "줄거리 정보가 없습니다."
            
            tmdb_movie_data = search_movie_by_title(title, release_year)
            if tmdb_movie_data:
                tmdb_id = tmdb_movie_data.get('id')
                tmdb_details_res = requests.get(f"https://api.themoviedb.org/3/movie/{tmdb_id}", params={'api_key': os.getenv('TMDB_API_KEY'), 'language': 'ko-KR'})
                if tmdb_details_res.ok:
                    tmdb_details = tmdb_details_res.json()
                    poster_url = get_full_poster_url(tmdb_details.get('poster_path'))
                    backdrop_url = get_full_poster_url(tmdb_details.get('backdrop_path'), size='w780')
                    if tmdb_details.get('overview'):
                        synopsis = tmdb_details.get('overview')

            runtime_str = kobis_details.get('showTm')
            runtime_int = int(runtime_str) if runtime_str and runtime_str.isdigit() else None
            
            # Transform genres from KOBIS format
            genres_list = kobis_details.get('genres', [])
            genres_str_list = [g['genreNm'] for g in genres_list if g and 'genreNm' in g]

            directors_list = kobis_details.get('directors', [])
            directors_str_list = [d['peopleNm'] for d in directors_list if d and 'peopleNm' in d]

            actors_list = kobis_details.get('actors', [])
            actors_str_list = [a['peopleNm'] for a in actors_list[:5] if a and 'peopleNm' in a]

            movie_data = {
                "id": movie_id, "title": title, "release_date": kobis_details.get('openDt'),
                "runtime": runtime_int, "genres": genres_str_list, "directors": directors_str_list,
                "actors": actors_str_list, "synopsis": synopsis, "poster_url": poster_url, 
                "backdrop_url": backdrop_url,
            }
            try:
                supabase_admin.table('movies').upsert(movie_data).execute()
            except Exception as e:
                print(f"DB에 KOBIS 영화 정보 캐싱 중 오류: {e}")

            movie_data.update({'user_rating': user_rating, 'is_liked': is_liked, 'comment': user_comment})
            return MovieDetails(**movie_data)

    print(f"ID {movie_id}를 TMDB ID로 간주하고 조회합니다.")
    try:
        tmdb_id = int(movie_id)
        details = await get_movie_detail_by_tmdb_id(tmdb_id, current_user)
        return details
    except (ValueError, TypeError):
        print(f"ID {movie_id}는 유효한 TMDB ID가 아닙니다.")
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"TMDB ID 조회 중 예상치 못한 오류: {e}")

    raise HTTPException(status_code=404, detail=f"영화 ID {movie_id}에 대한 정보를 찾을 수 없습니다.")