import os
import requests
import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from dateutil.parser import isoparse
import traceback

# Import services, clients, schemas, and handlers
from supabase_client import supabase_admin
from kobis_service import get_daily_box_office, get_movie_details
from recommendation_service import get_home_hybrid_recommendations
from tmdb_service import (
    search_movie_by_title, get_movie_poster_path, get_full_poster_url, 
    get_movies_for_onboarding, get_details_for_movies, get_trending_movies,
    get_now_playing_movies, get_top_rated_movies, get_movie_details_by_tmdb_id,
    get_movies_by_genre, GENRE_IDS, search_movies_by_query, get_recent_releases
)
from feature_service import extract_features_from_tmdb_details
from .user_interactions import get_user_activity_for_movie
from schemas import (
    Movie, MovieDetails, OnboardingMovie, MovieIdList, TrendingMovie, Genre, BoxOfficeBattleResponse
)
from auth_handler import get_current_user, get_current_user_optional
from llm_service import get_emotional_tags_for_movie
import random

router = APIRouter(
    tags=["Movies & Recommendations"]
)

def _parse_iso_datetime(date_string: str) -> datetime:
    """Parses an ISO 8601 datetime string into a timezone-aware datetime object."""
    # Ensure consistency with how Supabase stores timestamps (often with +00)
    # dateutil.parser.isoparse is robust for various ISO 8601 formats
    return isoparse(date_string)

async def _get_cached_or_fetch_list(list_type: str, fetch_function, cache_expiration_hours: int, **kwargs):
    page = kwargs.get('page', 1)
    # Only cache page 1 of results
    if page == 1:
        try:
            cached_data_res = supabase_admin.table('cached_lists').select('data, last_updated').eq('list_type', list_type).single().execute()
            cached_entry = cached_data_res.data
            if cached_entry and cached_entry.get('last_updated'):
                last_updated_dt = isoparse(cached_entry['last_updated'])
                if last_updated_dt > datetime.now(timezone.utc) - timedelta(hours=cache_expiration_hours):
                    return json.loads(cached_entry['data'])
        except Exception as e:
            if "PGRST116" not in str(e) and "NoneType" not in str(e): print(f"Error checking cache for {list_type}: {e}")
    
    # Correctly call async functions from tmdb_service
    # Inspect signature to see if 'page' is expected
    import inspect
    sig = inspect.signature(fetch_function)
    func_kwargs = {k: v for k, v in kwargs.items() if k in sig.parameters}
    data = await fetch_function(**func_kwargs)

    if not data:
        # For page > 1, empty is fine. For page 1, raise an error if appropriate, or return empty.
        if page == 1 and list_type != "new_releases": # New releases might legitimately be empty
             raise HTTPException(status_code=404, detail=f"{list_type} 정보를 가져오는 데 실패했습니다.")
        return []
    
    # Cache page 1 results
    if page == 1:
        try:
            supabase_admin.table('cached_lists').upsert(
                {"list_type": list_type, "data": json.dumps(data), "last_updated": datetime.now(timezone.utc).isoformat()},
                on_conflict='list_type'
            ).execute()
        except Exception as e:
            print(f"Error caching data for {list_type}: {e}")
    return data

@router.get("/movies/all-random", response_model=List[Movie])
async def get_all_random_movies(page: int = 1, limit: int = 20):
    """DB에 저장된 모든 영화를 무작위 순서로 반환합니다. 페이지네이션을 지원합니다."""
    try:
        count_res = supabase_admin.table('movies').select('id', count='exact').not_.is_('poster_url', 'null').execute()
        total_count = count_res.count
        if total_count == 0: return []
        random.seed(page)
        all_offsets = list(range(0, total_count, limit))
        random.shuffle(all_offsets)
        offset = all_offsets[(page - 1) % len(all_offsets)]
        movies_res = supabase_admin.table('movies').select('id, title, release_date, poster_url').not_.is_('poster_url', 'null').limit(limit).offset(offset).execute()
        if not movies_res.data: return []
        return [Movie(id=str(m['id']), title=m.get('title', 'N/A'), release=m.get('release_date', ''), poster_url=m.get('poster_url'), rank=0, audience=0, daily_audience=0) for m in movies_res.data]
    except Exception as e:
        print(f"랜덤 영화 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="랜덤 영화 목록을 가져오는 데 실패했습니다.")

@router.get("/genres", response_model=List[Genre])
async def get_genres():
    """TMDB에서 사용 가능한 영화 장르 목록을 가져옵니다. 결과는 24시간 동안 캐시됩니다."""
    list_type = "all_genres"
    cache_expiration_hours = 24
    try:
        cached_data_res = supabase_admin.table('cached_lists').select('data, last_updated').eq('list_type', list_type).single().execute()
        cached_entry = cached_data_res.data
        if cached_entry and cached_entry.get('last_updated'):
            last_updated_dt = isoparse(cached_entry['last_updated'])
            if last_updated_dt > datetime.now(timezone.utc) - timedelta(hours=cache_expiration_hours):
                return json.loads(cached_entry['data'])
    except Exception as e:
        if "PGRST116" not in str(e) and "NoneType" not in str(e): print(f"Error checking cache for {list_type}: {e}")
    
    # Generate fresh data (synchronous operation)
    genres_data = [{"id": v, "name": k} for k, v in GENRE_IDS.items()] # GENRE_IDS is from tmdb_service
    try:
        supabase_admin.table('cached_lists').upsert(
            {"list_type": list_type, "data": json.dumps(genres_data), "last_updated": datetime.now(timezone.utc).isoformat()},
            on_conflict='list_type'
        ).execute()
    except Exception as e:
        print(f"Error caching data for {list_type}: {e}")
    return genres_data

@router.get("/movies/search", response_model=List[TrendingMovie])
async def search_movies(query: str = Query(..., min_length=1)):
    """TMDB에서 영화를 검색합니다."""
    if not query: return []
    return await search_movies_by_query(query)

@router.get("/movies/trending", response_model=List[TrendingMovie])
async def get_trending(page: int = 1):
    """주간 트렌딩 영화 목록을 가져옵니다. 페이지네이션을 지원합니다."""
    return await _get_cached_or_fetch_list("trending_movies", get_trending_movies, 6, page=page)

@router.get("/movies/now_playing", response_model=List[TrendingMovie])
async def get_now_playing(page: int = 1):
    """현재 상영중인 영화 목록을 가져옵니다. 페이지네이션을 지원합니다."""
    return await _get_cached_or_fetch_list("now_playing_movies", get_now_playing_movies, 6, page=page)

@router.get("/movies/top_rated", response_model=List[TrendingMovie])
async def get_top_rated(page: int = 1):
    """평점 높은 영화 목록을 가져옵니다. 페이지네이션을 지원합니다."""
    return await _get_cached_or_fetch_list("top_rated_movies", get_top_rated_movies, 24, page=page)

@router.get("/movies/genre/{genre_id}", response_model=List[TrendingMovie])
async def get_movies_by_genre_endpoint(genre_id: int, page: int = 1):
    """특정 장르의 영화 목록을 가져옵니다. 페이지네이션을 지원합니다."""
    return await _get_cached_or_fetch_list(f"genre_{genre_id}_movies", get_movies_by_genre, 24, genre_id=genre_id, page=page)

@router.get("/movies/new-releases", response_model=List[TrendingMovie])
async def get_new_releases():
    """최근 30일 동안 개봉한 영화 목록을 가져옵니다."""
    # This function doesn't take a page argument for the underlying service call
    return await _get_cached_or_fetch_list("new_releases", get_recent_releases, 6, days_ago=30)

@router.get("/movies/onboarding", response_model=List[OnboardingMovie])
async def get_onboarding_movies_endpoint(mood: str | None = Query(None)):
    """온보딩 스와이프에 사용할 영화 목록을 기분에 따라 가져옵니다."""
    movies = await get_movies_for_onboarding(mood=mood)
    if not movies:
        raise HTTPException(status_code=404, detail="온보딩 영화 목록을 찾을 수 없습니다.")
    return movies

@router.post("/movies/details", response_model=List[OnboardingMovie])
async def get_movies_details_in_bulk(movie_ids: MovieIdList):
    """주어진 영화 ID 목록에 대한 상세 정보를 TMDB에서 가져옵니다. 온보딩 결과 화면에서 사용됩니다."""
    if not movie_ids.ids:
        return []
    movie_details = await get_details_for_movies(movie_ids.ids)
    if not movie_details:
        raise HTTPException(status_code=404, detail="요청한 영화 정보를 찾을 수 없습니다.")
    return movie_details

@router.get("/movies/box-office", response_model=List[Movie])
def get_box_office_live(sort_by: str = Query("rank", enum=["rank", "audience"])):
    """KOBIS API를 사용하여 실시간 박스오피스 정보를 가져옵니다."""
    # This is a synchronous function, handled directly
    raw_movies_kobis = get_daily_box_office()
    if raw_movies_kobis is None: return []
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
        if cached_movie and cached_movie.get('poster_url') and cached_movie.get('last_updated'):
            last_updated_dt = isoparse(cached_movie['last_updated'])
            if last_updated_dt > datetime.now(timezone.utc) - timedelta(hours=6):
                is_cache_valid = True
        
        cumulative_audience, daily_audience = int(m.get('audiAcc', 0)), int(m.get('audiCnt', 0))
        if is_cache_valid:
            enriched_movies.append(Movie(id=movie_id, rank=int(m.get('rank')), title=cached_movie.get('title'), release=cached_movie.get('release_date'), audience=cumulative_audience, daily_audience=daily_audience, poster_url=cached_movie.get('poster_url')))
        else:
            title, release_year = m.get('movieNm'), m.get('openDt')[:4] if m.get('openDt') else None
            poster_url = None
            tmdb_movie_data = search_movie_by_title(title, release_year)
            if tmdb_movie_data:
                tmdb_id, poster_path = tmdb_movie_data.get('id'), get_movie_poster_path(tmdb_movie_data.get('id'))
                poster_url = get_full_poster_url(poster_path)
            
            movies_to_upsert.append({"id": movie_id, "title": title, "release_date": m.get('openDt'), "poster_url": poster_url, "last_updated": datetime.now(timezone.utc).isoformat()})
            enriched_movies.append(Movie(id=movie_id, rank=int(m.get('rank')), title=title, release=m.get('openDt'), audience=cumulative_audience, daily_audience=daily_audience, poster_url=poster_url))

    if movies_to_upsert:
        try:
            supabase_admin.table('movies').upsert(movies_to_upsert).execute()
        except Exception as e:
            print(f"DB에 영화 정보 업데이트 중 오류: {e}")
            
    enriched_movies.sort(key=lambda x: x.rank if sort_by == "rank" else x.audience, reverse=(sort_by == "audience"))
    return enriched_movies

@router.get("/movies/box-office/battle", response_model=BoxOfficeBattleResponse)
async def get_box_office_battle():
    """KOBIS API를 사용하여 한국 영화와 외국 영화의 현재 박스오피스 1위를 각각 가져옵니다."""
    try:
        korean_movies_raw = get_daily_box_office(repNationCd='K')
        foreign_movies_raw = get_daily_box_office(repNationCd='F')
        top_korean_raw = korean_movies_raw[0] if korean_movies_raw else None
        top_foreign_raw = foreign_movies_raw[0] if foreign_movies_raw else None
        battle_movies_raw = [m for m in [top_korean_raw, top_foreign_raw] if m is not None]
        if not battle_movies_raw: return BoxOfficeBattleResponse()
        enriched_results = {}
        for movie_raw in battle_movies_raw:
            movie_id, title = movie_raw.get('movieCd'), movie_raw.get('movieNm')
            poster_url = None
            try:
                cached_movie_res = supabase_admin.table('movies').select('poster_url').eq('id', movie_id).single().execute()
                if cached_movie_res.data and cached_movie_res.data.get('poster_url'):
                    poster_url = cached_movie_res.data['poster_url']
                else: raise Exception("No cached poster")
            except Exception:
                release_year = movie_raw.get('openDt')[:4] if movie_raw.get('openDt') else None
                tmdb_movie_data = search_movie_by_title(title, release_year)
                if tmdb_movie_data:
                    poster_path = get_movie_poster_path(tmdb_movie_data.get('id'))
                    poster_url = get_full_poster_url(poster_path)
            enriched_movie = Movie(id=movie_id, rank=int(movie_raw.get('rank', 0)), title=title, release=movie_raw.get('openDt', ''), audience=int(movie_raw.get('audiAcc', 0)), daily_audience=int(movie_raw.get('audiCnt', 0)), rank_change=movie_raw.get('rankInten'), poster_url=poster_url)
            nation = movie_raw.get('repNationNm')
            if nation and '한국' in nation:
                enriched_results['korean'] = enriched_movie
            else:
                enriched_results['foreign'] = enriched_movie
        return BoxOfficeBattleResponse(**enriched_results)
    except Exception as e:
        print(f"박스오피스 배틀 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="박스오피스 배틀 정보를 가져오는 데 실패했습니다.")

@router.get("/recommendations/mood", response_model=List[Movie])
async def get_mood_recommendations(current_user: dict = Depends(get_current_user), mood_keywords: str = Query(...)):
    """기분 키워드에 따른 영화 추천 목록을 반환합니다."""
    keywords = [keyword.strip() for keyword in mood_keywords.split(',')]
    recommendation_ids = await get_home_hybrid_recommendations(user_id=current_user.id, mood_keywords=keywords)
    if not recommendation_ids: return []
    try:
        movies_res = supabase_admin.table('movies').select('*').in_('id', recommendation_ids).execute()
        if not movies_res.data: return []
        movies_dict = {str(m['id']): m for m in movies_res.data}
        ordered_movies = [movies_dict[str(id)] for id in recommendation_ids if str(id) in movies_dict]
        return [Movie(id=str(m['id']), rank=0, title=m.get('title'), release=m.get('release_date', ''), audience=0, daily_audience=0, poster_url=m.get('poster_url')) for m in ordered_movies]
    except Exception as e:
        print(f"추천 영화 상세 정보 처리 중 오류 발생: {e}")
        return []

@router.get("/movies/tmdb/{tmdb_id}", response_model=MovieDetails)
async def get_movie_detail_by_tmdb_id(tmdb_id: int, current_user: dict | None = Depends(get_current_user_optional)):
    """TMDB ID로 영화 상세 정보를 가져오고 캐시합니다."""
    details = await get_movie_details_by_tmdb_id(tmdb_id)
    if not details:
        raise HTTPException(status_code=404, detail="TMDB에서 영화 정보를 찾을 수 없습니다.")
    
    # Store/update movie details in local DB for caching and enrichment
    try:
        movie_id_str = str(tmdb_id)
        additional_features = extract_features_from_tmdb_details(details)
        movie_to_cache = {
            "id": movie_id_str, 
            "title": details.get("title"), 
            "release_date": details.get("release"), 
            "poster_url": details.get("poster_url"), 
            "genres": details.get("genres"),
            "synopsis": details.get("synopsis"),
            "runtime": details.get("runtime"),
            "backdrop_url": details.get("backdrop_url"),
            "watch_providers": details.get("watch_providers"),
            "watch_link": details.get("watch_link"),
            "last_updated": datetime.now(timezone.utc).isoformat(),
            **additional_features
        }
        supabase_admin.table('movies').upsert(movie_to_cache).execute()
        
        # Fetch existing emotional tags or generate new ones
        try:
            existing_movie_res = supabase_admin.table("movies").select("emotional_tags").eq("id", movie_id_str).single().execute()
            if not existing_movie_res.data or not existing_movie_res.data.get("emotional_tags"):
                emotional_tags = get_emotional_tags_for_movie(details.get("title"))
                supabase_admin.table("movies").update({"emotional_tags": emotional_tags}).eq("id", movie_id_str).execute()
                details['emotional_tags'] = emotional_tags
        except Exception as e:
            print(f"Error handling emotional tags for {details.get('title')}: {e}")

    except Exception as e:
        print(f"DB에 TMDB 영화 정보 저장 중 오류 발생: {e}")

    user_rating, is_liked, comment = None, False, None
    if current_user:
        try:
            activity_status = get_user_activity_for_movie(movie_id=str(tmdb_id), current_user=current_user)
            user_rating = activity_status.user_rating
            is_liked = activity_status.is_liked
            comment = activity_status.comment
        except Exception as e:
            print(f"Error fetching user activity for movie {tmdb_id}: {e}")
            pass
    details['user_rating'] = user_rating
    details['is_liked'] = is_liked
    details['comment'] = comment
    return details

@router.get("/movies/{movie_id}/similar", response_model=List[Movie])
async def get_content_similar_movies(movie_id: str):
    """주어진 영화와 내용이 유사한 영화 목록을 반환합니다."""
    try:
        content_sim_res = supabase_admin.table('cached_lists').select('data').eq('list_type', "content_similar_top_k").single().execute()
        if not content_sim_res.data or not content_sim_res.data.get('data'):
            return []
        content_similarities = json.loads(content_sim_res.data['data'])
        similar_movies_data = content_similarities.get(str(movie_id))
        if not similar_movies_data: return []
        similar_movies_data.sort(key=lambda x: x['score'], reverse=True)
        similar_movie_ids = [item['id'] for item in similar_movies_data]
        movies_res = supabase_admin.table('movies').select('id, title, release_date, poster_url').in_('id', similar_movie_ids).execute()
        if not movies_res.data: return []
        movies_dict = {str(m['id']): m for m in movies_res.data}
        ordered_similar_movies = []
        for sim_id in similar_movie_ids:
            movie_data = movies_dict.get(str(sim_id))
            if movie_data:
                ordered_similar_movies.append(Movie(id=str(movie_data['id']), title=movie_data.get('title', 'N/A'), release=movie_data.get('release_date', ''), poster_url=movie_data.get('poster_url'), rank=0, audience=0, daily_audience=0))
        return ordered_similar_movies
    except Exception as e:
        if "PGRST116" in str(e): return []
        print(f"유사 영화 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="유사 영화를 가져오는 데 실패했습니다.")

@router.get("/movies/{movie_id}", response_model=MovieDetails)
async def get_movie_detail_by_id(movie_id: str, current_user: dict | None = Depends(get_current_user_optional)):
    """지능적으로 KOBIS 또는 TMDB ID를 처리하여 영화 상세 정보를 반환합니다."""
    print(f"--- 상세 정보 조회 시작 (통합 ID: {movie_id}) ---")
    user_rating, user_comment, is_liked = None, None, False
    if current_user:
        try:
            activity_status = get_user_activity_for_movie(movie_id=movie_id, current_user=current_user)
            user_rating, user_comment, is_liked = activity_status.user_rating, activity_status.comment, activity_status.is_liked
        except Exception as e:
            print(f"활동 상태 조회 중 예외 발생 (정상일 수 있음): {e}")

    try: # Check local cache first
        cached_movie_res = supabase_admin.table('movies').select('*').eq('id', movie_id).single().execute()
        cached_movie = cached_movie_res.data
        if cached_movie:
            genres = cached_movie.get('genres') or []
            if genres and isinstance(genres[0], dict): # Handle old KOBIS genre format
                if 'name' in genres[0]: cached_movie['genres'] = [g['name'] for g in genres]
                elif 'genreNm' in genres[0]: cached_movie['genres'] = [g['genreNm'] for g in genres]
            cached_movie.update({'user_rating': user_rating, 'is_liked': is_liked, 'comment': user_comment})
            return MovieDetails(**cached_movie)
    except Exception as e:
        if "PGRST116" not in str(e): print(f"DB 캐시 조회 중 오류: {e}")

    if len(movie_id) > 7 and movie_id.isdigit(): # Assume KOBIS ID
        kobis_details = get_movie_details(movie_id)
        if kobis_details and kobis_details.get('movieNm'):
            title = kobis_details.get('movieNm')
            release_year = kobis_details.get('openDt')[:4] if kobis_details.get('openDt') else None
            poster_url, backdrop_url, synopsis = None, None, "줄거리 정보가 없습니다."
            tmdb_movie_data = search_movie_by_title(title, release_year)
            if tmdb_movie_data:
                tmdb_id = tmdb_movie_data.get('id')
                poster_path = get_movie_poster_path(tmdb_id)
                poster_url = get_full_poster_url(poster_path)
                backdrop_url = get_full_poster_url(tmdb_movie_data.get('backdrop_path'), size='w780') if tmdb_movie_data.get('backdrop_path') else None
                if tmdb_movie_data.get('overview'): synopsis = tmdb_movie_data.get('overview')
            
            runtime_str = kobis_details.get('showTm')
            runtime_int = int(runtime_str) if runtime_str and runtime_str.isdigit() else None
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
                "backdrop_url": backdrop_url, "last_updated": datetime.now(timezone.utc).isoformat()
            }
            try:
                supabase_admin.table('movies').upsert(movie_data).execute()
            except Exception as e: print(f"DB에 KOBIS 영화 정보 캐싱 중 오류: {e}")
            movie_data.update({'user_rating': user_rating, 'is_liked': is_liked, 'comment': user_comment})
            return MovieDetails(**movie_data)

    try: # Assume TMDB ID
        tmdb_id = int(movie_id)
        details = await get_movie_detail_by_tmdb_id(tmdb_id, current_user)
        details.update({'user_rating': user_rating, 'is_liked': is_liked, 'comment': user_comment})
        return MovieDetails(**details)
    except (ValueError, TypeError):
        pass # Not a valid TMDB ID, proceed to next check if any

    raise HTTPException(status_code=404, detail=f"영화 ID {movie_id}에 대한 정보를 찾을 수 없습니다.")
