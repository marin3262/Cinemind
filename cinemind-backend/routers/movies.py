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

# Placeholder for missing posters
POSTER_PLACEHOLDER = "https://via.placeholder.com/500x750.png?text=Image+Not+Available"


def _parse_iso_datetime(date_string: str) -> datetime:
    """Parses an ISO 8601 datetime string into a timezone-aware datetime object."""
    return isoparse(date_string)

async def _get_cached_or_fetch_list(list_type: str, fetch_function, cache_expiration_hours: int, **kwargs):
    page = kwargs.get('page', 1)
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
    
    import inspect
    sig = inspect.signature(fetch_function)
    func_kwargs = {k: v for k, v in kwargs.items() if k in sig.parameters}
    data = await fetch_function(**func_kwargs)

    if not data:
        if page == 1 and list_type != "new_releases":
             raise HTTPException(status_code=404, detail=f"{list_type} 정보를 가져오는 데 실패했습니다.")
        return []
    
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
        
        movies = []
        for m in movies_res.data:
            movies.append(Movie(id=str(m['id']), title=m.get('title', 'N/A'), release=m.get('release_date', ''), poster_url=m.get('poster_url'), rank=0, audience=0, daily_audience=0, recommendation_reason="#새로운 발견"))
        return movies
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
    
    genres_data = [{"id": v, "name": k} for k, v in GENRE_IDS.items()]
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
    if not query: return []
    return await search_movies_by_query(query)

@router.get("/movies/trending", response_model=List[TrendingMovie])
async def get_trending(page: int = 1):
    data = await _get_cached_or_fetch_list("trending_movies", get_trending_movies, 6, page=page)
    for movie in data:
        movie['recommendation_reason'] = "#주간 트렌드"
    return data

@router.get("/movies/now_playing", response_model=List[TrendingMovie])
async def get_now_playing(page: int = 1):
    data = await _get_cached_or_fetch_list("now_playing_movies", get_now_playing_movies, 6, page=page)
    for movie in data:
        movie['recommendation_reason'] = "#현재 상영중"
    return data

@router.get("/movies/top_rated", response_model=List[TrendingMovie])
async def get_top_rated(page: int = 1):
    data = await _get_cached_or_fetch_list("top_rated_movies", get_top_rated_movies, 24, page=page)
    for movie in data:
        movie['recommendation_reason'] = "#명예의 전당"
    return data

@router.get("/movies/genre/{genre_id}", response_model=List[TrendingMovie])
async def get_movies_by_genre_endpoint(genre_id: int, page: int = 1):
    id_to_genre_name_map = {v: k for k, v in GENRE_IDS.items()}
    genre_name = id_to_genre_name_map.get(genre_id, "영화")
    data = await _get_cached_or_fetch_list(f"genre_{genre_id}_movies", get_movies_by_genre, 24, genre_id=genre_id, page=page)
    for movie in data:
        movie['recommendation_reason'] = f"#{genre_name} 추천"
    return data

@router.get("/movies/new-releases", response_model=List[TrendingMovie])
async def get_new_releases():
    data = await _get_cached_or_fetch_list("new_releases", get_recent_releases, 6, days_ago=30)
    for movie in data:
        movie['recommendation_reason'] = "#따끈따끈 신작"
    return data

@router.get("/movies/onboarding", response_model=List[OnboardingMovie])
async def get_onboarding_movies_endpoint(mood_keywords: str = Query("")):
    keywords_list = [kw.strip() for kw in mood_keywords.split(',') if kw.strip()]
    movies = await get_movies_for_onboarding(mood_keywords=keywords_list)
    if not movies:
        raise HTTPException(status_code=404, detail="온보딩 영화 목록을 찾을 수 없습니다.")
    return movies

@router.post("/movies/details", response_model=List[OnboardingMovie])
async def get_movies_details_in_bulk(movie_ids: MovieIdList):
    if not movie_ids.ids:
        return []
    movie_details = await get_details_for_movies(movie_ids.ids)
    if not movie_details:
        raise HTTPException(status_code=404, detail="요청한 영화 정보를 찾을 수 없습니다.")
    return movie_details

@router.get("/movies/box-office", response_model=List[Movie])
def get_box_office_live(sort_by: str = Query("rank", enum=["rank", "audience"])):
    """KOBIS API를 사용하여 실시간 박스오피스 정보를 가져옵니다."""
    raw_movies_kobis = get_daily_box_office()
    if raw_movies_kobis is None: return []
    
    movie_ids_kobis = [m.get('movieCd') for m in raw_movies_kobis]
    
    try:
        # DB에서 캐시된 영화 정보 미리 가져오기
        cached_movies_res = supabase_admin.table('movies').select('id', 'title', 'release_date', 'poster_url').in_('id', movie_ids_kobis).execute()
        cached_movies_dict = {m['id']: m for m in cached_movies_res.data}
    except Exception as e:
        print(f"DB에서 캐시된 영화 조회 중 오류: {e}")
        cached_movies_dict = {}
    
    temp_enriched_movies = []
    movies_to_upsert = []

    for m in raw_movies_kobis:
        movie_id = m.get('movieCd')
        cached_movie = cached_movies_dict.get(movie_id)
        
        poster_url = None
        # 유효한 캐시가 있는지 확인 (포스터 URL 포함)
        if cached_movie and cached_movie.get('poster_url') and cached_movie.get('poster_url') != POSTER_PLACEHOLDER:
            poster_url = cached_movie.get('poster_url')
        else:
            title, release_year = m.get('movieNm'), m.get('openDt')[:4] if m.get('openDt') else None
            tmdb_movie_data = search_movie_by_title(title, release_year)
            if tmdb_movie_data:
                poster_path = get_movie_poster_path(tmdb_movie_data.get('id'))
                poster_url = get_full_poster_url(poster_path)

        final_poster_url = poster_url or POSTER_PLACEHOLDER
        
        # movies 테이블에 최신 정보 업데이트/삽입 준비
        movies_to_upsert.append({
            "id": movie_id, "title": m.get('movieNm'), "release_date": m.get('openDt'),
            "poster_url": final_poster_url, "last_updated": datetime.now(timezone.utc).isoformat()
        })

        temp_enriched_movies.append({
            "id": movie_id,
            "daily_rank": int(m.get('rank')),
            "title": m.get('movieNm'),
            "release": m.get('openDt'),
            "audience": int(m.get('audiAcc', 0)),
            "daily_audience": int(m.get('audiCnt', 0)),
            "poster_url": final_poster_url
        })

    if movies_to_upsert:
        try:
            supabase_admin.table('movies').upsert(movies_to_upsert).execute()
        except Exception as e:
            print(f"DB에 영화 정보 업데이트 중 오류: {e}")
            
    # Sort the list first based on the query parameter
    if sort_by == 'audience':
        temp_enriched_movies.sort(key=lambda x: x['audience'], reverse=True)
        reason_prefix = "#누적"
    else: # sort_by == 'rank'
        temp_enriched_movies.sort(key=lambda x: x['daily_rank'])
        reason_prefix = "#일별"
        
    # Now, iterate through the SORTED list to assign the final rank and reason
    final_movies = []
    for i, movie_data in enumerate(temp_enriched_movies):
        correct_rank = i + 1
        final_movies.append(Movie(
            id=movie_data['id'],
            rank=correct_rank, # Assign the correct rank based on the sort order
            title=movie_data['title'],
            release=movie_data['release'],
            audience=movie_data['audience'],
            daily_audience=movie_data['daily_audience'],
            poster_url=movie_data['poster_url'],
            recommendation_reason=f"{reason_prefix} {correct_rank}위"
        ))
        
    return final_movies

@router.get("/movies/box-office/battle", response_model=BoxOfficeBattleResponse)
async def get_box_office_battle():
    try:
        # Get the top 10 movies from the general box office
        all_movies_raw = get_daily_box_office()
        if not all_movies_raw or len(all_movies_raw) < 2:
            # Not enough movies for a battle
            return BoxOfficeBattleResponse()

        # Identify champion (rank 1) and challenger (rank 2)
        champion_raw = all_movies_raw[0]
        challenger_raw = all_movies_raw[1]

        battle_movies_raw = [champion_raw, challenger_raw]
        enriched_results = {}
        
        for movie_raw in battle_movies_raw:
            movie_id, title = movie_raw.get('movieCd'), movie_raw.get('movieNm')
            poster_url = None
            try:
                # Try to get poster from our DB cache first
                cached_movie_res = supabase_admin.table('movies').select('poster_url').eq('id', movie_id).single().execute()
                if cached_movie_res.data and cached_movie_res.data.get('poster_url'):
                    poster_url = cached_movie_res.data['poster_url']
                else: raise Exception("No cached poster")
            except Exception:
                # If not in cache, fetch from TMDB
                release_year = movie_raw.get('openDt')[:4] if movie_raw.get('openDt') else None
                tmdb_movie_data = search_movie_by_title(title, release_year)
                if tmdb_movie_data:
                    poster_path = get_movie_poster_path(tmdb_movie_data.get('id'))
                    poster_url = get_full_poster_url(poster_path)
            
            final_poster_url = poster_url or POSTER_PLACEHOLDER
            
            enriched_movie = Movie(
                id=movie_id, rank=int(movie_raw.get('rank', 0)), title=title, 
                release=movie_raw.get('openDt', ''), audience=int(movie_raw.get('audiAcc', 0)), 
                daily_audience=int(movie_raw.get('audiCnt', 0)), rank_change=movie_raw.get('rankInten'), 
                poster_url=final_poster_url, recommendation_reason="#오늘의 매치업"
            )
            
            # Assign to 'champion' or 'challenger' based on rank
            if movie_raw.get('rank') == '1':
                enriched_results['champion'] = enriched_movie
            elif movie_raw.get('rank') == '2':
                enriched_results['challenger'] = enriched_movie

        return BoxOfficeBattleResponse(**enriched_results)
    except Exception as e:
        print(f"박스오피스 배틀 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="박스오피스 배틀 정보를 가져오는 데 실패했습니다.")

@router.get("/recommendations/mood", response_model=List[TrendingMovie])
async def get_mood_recommendations(current_user: dict = Depends(get_current_user), mood_keywords: str = ""):
    keywords = [keyword.strip() for keyword in mood_keywords.split(',') if keyword.strip()]
    recommended_movies = await get_home_hybrid_recommendations(
        user_id=current_user.id, 
        mood_keywords=keywords
    )
    
    if not recommended_movies:
        return []

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

@router.get("/movies/tmdb/{tmdb_id}", response_model=MovieDetails)
async def get_movie_detail_by_tmdb_id(tmdb_id: int, current_user: dict | None = Depends(get_current_user_optional)):
    details = await get_movie_details_by_tmdb_id(tmdb_id)
    if not details: raise HTTPException(status_code=404, detail="TMDB에서 영화 정보를 찾을 수 없습니다.")
    if not details.get('poster_url'): details['poster_url'] = POSTER_PLACEHOLDER
    try:
        movie_id_str = str(tmdb_id)
        additional_features = extract_features_from_tmdb_details(details)
        movie_to_cache = { "id": movie_id_str, "title": details.get("title"), "release_date": details.get("release"), "poster_url": details.get("poster_url"), "genres": details.get("genres"), "synopsis": details.get("synopsis"), "runtime": details.get("runtime"), "backdrop_url": details.get("backdrop_url"), "watch_providers": details.get("watch_providers"), "watch_link": details.get("watch_link"), "last_updated": datetime.now(timezone.utc).isoformat(), **additional_features }
        supabase_admin.table('movies').upsert(movie_to_cache).execute()
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
            user_rating, is_liked, comment = activity_status.user_rating, activity_status.is_liked, activity_status.comment
        except Exception as e:
            print(f"Error fetching user activity for movie {tmdb_id}: {e}")
    details['user_rating'], details['is_liked'], details['comment'] = user_rating, is_liked, comment
    return details

@router.get("/movies/{movie_id}/similar", response_model=List[Movie])
async def get_content_similar_movies(movie_id: str):
    try:
        source_movie_res = supabase_admin.table('movies').select('title').eq('id', movie_id).single().execute()
        source_movie_title = source_movie_res.data.get('title') if source_movie_res.data else "선택한 영화"
        content_sim_res = supabase_admin.table('cached_lists').select('data').eq('list_type', "content_similar_top_k").single().execute()
        if not content_sim_res.data or not content_sim_res.data.get('data'): return []
        content_similarities = json.loads(content_sim_res.data['data'])
        similar_movies_data = content_similarities.get(str(movie_id))
        if not similar_movies_data: return []
        similar_movies_data.sort(key=lambda x: x['score'], reverse=True)
        similar_movie_ids = [item['id'] for item in similar_movies_data]
        movies_res = supabase_admin.table('movies').select('id, title, release_date, poster_url').in_('id', similar_movie_ids).execute()
        if not movies_res.data: return []
        movies_dict = {str(m['id']): m for m in movies_res.data}
        ordered_similar_movies = []
        reason = f"#'{source_movie_title}' 팬이라면"
        for sim_id in similar_movie_ids:
            movie_data = movies_dict.get(str(sim_id))
            if movie_data:
                ordered_similar_movies.append(Movie(
                    id=str(movie_data['id']), title=movie_data.get('title', 'N/A'), release=movie_data.get('release_date', ''),
                    poster_url=movie_data.get('poster_url') or POSTER_PLACEHOLDER, rank=0, audience=0, daily_audience=0,
                    recommendation_reason=reason
                ))
        return ordered_similar_movies
    except Exception as e:
        if "PGRST116" in str(e): return []
        print(f"유사 영화 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="유사 영화를 가져오는 데 실패했습니다.")

@router.get("/movies/{movie_id}", response_model=MovieDetails)
async def get_movie_detail_by_id(movie_id: str, current_user: dict | None = Depends(get_current_user_optional)):
    """
    KOBIS 또는 TMDB ID로 영화 상세 정보를 조회합니다.
    정보가 부족할 경우, 두 API의 정보를 교차 조회하여 데이터를 보강하고 캐싱합니다.
    """
    user_rating, user_comment, is_liked = None, None, False
    if current_user:
        try:
            activity_status = get_user_activity_for_movie(movie_id=movie_id, current_user=current_user)
            user_rating, user_comment, is_liked = activity_status.user_rating, activity_status.comment, activity_status.is_liked
        except Exception: pass

    # 1. DB Cache Check
    try:
        cached_movie_res = supabase_admin.table('movies').select('*').eq('id', movie_id).single().execute()
        cached_movie = cached_movie_res.data
        if cached_movie and cached_movie.get('synopsis') and cached_movie.get('genres'):
            cached_movie.update({'user_rating': user_rating, 'is_liked': is_liked, 'comment': user_comment})
            cached_movie['genres'] = cached_movie.get('genres') or []
            cached_movie['directors'] = cached_movie.get('directors') or []
            cached_movie['actors'] = cached_movie.get('actors') or []
            return MovieDetails(**cached_movie)
    except Exception as e:
        if "PGRST116" not in str(e): print(f"DB 캐시 조회 중 오류: {e}")

    # 2. Determine ID type and fetch initial data
    is_kobis_id = len(movie_id) > 7 and movie_id.isdigit()
    
    details = {}
    tmdb_details = {}

    if is_kobis_id:
        kobis_details = get_movie_details(movie_id)
        if not kobis_details or not kobis_details.get('movieNm'):
            raise HTTPException(status_code=404, detail="KOBIS에서 영화 정보를 찾을 수 없습니다.")
        
        details['id'] = movie_id
        details['title'] = kobis_details.get('movieNm')
        details['release_date'] = kobis_details.get('openDt')
        details['runtime'] = int(kobis_details.get('showTm', 0))

        # Correctly get supplemental data from TMDB
        tmdb_search_result = search_movie_by_title(kobis_details.get('movieNm'), kobis_details.get('openDt', '')[:4])
        if tmdb_search_result:
            tmdb_id = tmdb_search_result.get('id')
            tmdb_details = await get_movie_details_by_tmdb_id(tmdb_id) if tmdb_id else {}
        else:
            tmdb_details = {}

    else: # Assumed to be TMDB ID
        tmdb_details = await get_movie_details_by_tmdb_id(movie_id)
        if not tmdb_details:
            raise HTTPException(status_code=404, detail="TMDB에서 영화 정보를 찾을 수 없습니다.")
        
        details = tmdb_details.copy()
        details['id'] = movie_id
        details['release_date'] = tmdb_details.get('release')


    # 3. Merge and Enrich Data
    details['genres'] = tmdb_details.get('genres') or (details.get('genres') or [])
    details['directors'] = tmdb_details.get('directors') or (details.get('directors') or [])
    details['actors'] = tmdb_details.get('actors') or (details.get('actors') or [])
    details['synopsis'] = tmdb_details.get('synopsis') or "줄거리 정보가 없습니다."
    details['poster_url'] = tmdb_details.get('poster_url') or details.get('poster_url') or POSTER_PLACEHOLDER
    details['backdrop_url'] = tmdb_details.get('backdrop_url')
    details['runtime'] = int(tmdb_details.get('runtime') or details.get('runtime') or 0)

    # 4. Cache the enriched data to our DB
    try:
        # Data sanitization before caching
        release_date = details.get('release_date')
        if release_date == "":
            release_date = None

        db_record = { "id": details['id'], "title": details.get('title'), "release_date": release_date, "runtime": details.get('runtime'), "genres": details.get('genres'), "directors": details.get('directors'), "actors": details.get('actors'), "synopsis": details.get('synopsis'), "poster_url": details.get('poster_url'), "backdrop_url": details.get('backdrop_url'), "last_updated": datetime.now(timezone.utc).isoformat() }
        supabase_admin.table('movies').upsert(db_record).execute()
    except Exception as e:
        print(f"DB에 영화 정보 캐싱 중 오류: {e}")

    # 5. Add user-specific data and return
    details.update({'user_rating': user_rating, 'is_liked': is_liked, 'comment': user_comment})
    for key in ['genres', 'directors', 'actors']:
        if details.get(key) is None: details[key] = []
            
    return MovieDetails(**details)