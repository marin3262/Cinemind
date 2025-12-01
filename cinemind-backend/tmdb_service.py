# tmdb_service.py
import os
import requests
import httpx
import asyncio
import random
from typing import List, Dict, Optional
from datetime import datetime, timedelta

TMDB_API_KEY = os.getenv('TMDB_API_KEY')
TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'

# TMDB 장르 ID
GENRE_IDS = {
    "액션": 28, "모험": 12, "애니메이션": 16, "코미디": 35,
    "드라마": 18, "가족": 10751, "판타지": 14, "역사": 36,
    "음악": 10402, "미스터리": 9648, "로맨스": 10749,
    "SF": 878, "스릴러": 53, "다큐멘터리": 99
}

# 기본값 (기분 키워드가 지정되지 않았을 경우)
DEFAULT_ONBOARDING_GENRE_NAMES = [
    "액션", "로맨스", "코미디", "SF", "애니메이션", "스릴러"
]
MIN_ONBOARDING_MOVIES = 10

def get_full_poster_url(poster_path: str, size: str = 'w500'):
    """
    포스터 경로와 사이즈를 받아 전체 이미지 URL을 생성합니다.
    """
    if not poster_path:
        return None
    return f"https://image.tmdb.org/t/p/{size}{poster_path}"

def search_movie_by_title(title: str, year: str = None):
    """
    영화 제목과 개봉 연도로 TMDB에서 영화를 검색합니다.
    """
    if not TMDB_API_KEY:
        print("TMDB_API_KEY가 설정되지 않았습니다.")
        return None

    params = {
        'api_key': TMDB_API_KEY,
        'query': title,
        'language': 'ko-KR',
        'region': 'KR'
    }
    if year:
        params['year'] = year

    try:
        response = requests.get(f"{TMDB_API_BASE_URL}/search/movie", params=params)
        response.raise_for_status()
        results = response.json().get('results')
        if results:
            return results[0]
        return None
    except requests.exceptions.RequestException as e:
        print(f"TMDB API 영화 검색 중 오류 발생: {e}")
        return None

def get_movie_poster_path(tmdb_id: int):
    """
    TMDB 영화 ID로 상세 정보를 조회하여 포스터 경로를 반환합니다.
    """
    if not TMDB_API_KEY:
        return None
    
    params = {
        'api_key': TMDB_API_KEY,
        'language': 'ko-KR'
    }
    
    try:
        response = requests.get(f"{TMDB_API_BASE_URL}/movie/{tmdb_id}", params=params)
        response.raise_for_status()
        data = response.json()
        return data.get('poster_path')
    except requests.exceptions.RequestException as e:
        print(f"TMDB API 영화 상세 정보 조회 중 오류 발생: {e}")
        return None

async def get_movies_for_onboarding(mood_keywords: List[str]) -> List[dict]:
    """
    온보딩 스와이프 화면을 위한 영화 목록을 가져오고, 각 영화의 주요 배우 정보를 포함합니다.
    결과가 부족할 경우 다른 인기 장르에서 영화를 보충합니다.
    """
    target_genre_names = mood_keywords if mood_keywords else DEFAULT_ONBOARDING_GENRE_NAMES
    target_genre_ids = [GENRE_IDS[name] for name in target_genre_names if name in GENRE_IDS]
    
    if not target_genre_ids:
        target_genre_ids = [GENRE_IDS[name] for name in DEFAULT_ONBOARDING_GENRE_NAMES]

    id_to_genre_name_map = {v: k for k, v in GENRE_IDS.items()}
    
    movie_candidates = []
    seen_movie_ids = set()

    async with httpx.AsyncClient() as client:
        # 1. 사용자가 선택한 장르에서 영화 후보군 수집
        tasks = []
        for genre_id in target_genre_ids:
            random_page = random.randint(1, 5)
            url = f"{TMDB_API_BASE_URL}/discover/movie"
            params = {
                "api_key": TMDB_API_KEY, "with_genres": str(genre_id), "sort_by": "popularity.desc",
                "language": "ko-KR", "page": random_page, "region": "KR", "vote_count.gte": 100
            }
            tasks.append(client.get(url, params=params))

        discover_responses = await asyncio.gather(*tasks, return_exceptions=True)

        for i, response in enumerate(discover_responses):
            if isinstance(response, httpx.Response) and response.status_code == 200:
                data = response.json()
                current_genre_id = target_genre_ids[i % len(target_genre_ids)]
                genre_name = id_to_genre_name_map.get(current_genre_id, "기타")
                
                for movie in data.get("results", [])[:7]: # 장르당 7개씩 우선 수집
                    if movie.get("poster_path") and movie["id"] not in seen_movie_ids:
                        movie_candidates.append({
                            "movie_id": movie["id"], "title": movie["title"],
                            "poster_url": get_full_poster_url(movie['poster_path']),
                            "genre_name": genre_name
                        })
                        seen_movie_ids.add(movie["id"])
        
        # 2. 영화가 부족할 경우, 기본 인기 장르에서 보충 (Fallback)
        if len(seen_movie_ids) < MIN_ONBOARDING_MOVIES:
            print(f"온보딩 영화 부족: {len(seen_movie_ids)}편. 기본 장르에서 보충합니다.")
            
            fallback_tasks = []
            # 선택된 장르를 제외한 기본 장르 목록
            fallback_genre_names = [name for name in DEFAULT_ONBOARDING_GENRE_NAMES if name not in target_genre_names]
            
            for genre_name in fallback_genre_names:
                genre_id = GENRE_IDS[genre_name]
                random_page = random.randint(1, 5)
                url = f"{TMDB_API_BASE_URL}/discover/movie"
                params = {
                    "api_key": TMDB_API_KEY, "with_genres": str(genre_id), "sort_by": "popularity.desc",
                    "language": "ko-KR", "page": random_page, "region": "KR", "vote_count.gte": 100
                }
                fallback_tasks.append(client.get(url, params=params))

            fallback_responses = await asyncio.gather(*fallback_tasks, return_exceptions=True)

            for i, response in enumerate(fallback_responses):
                if len(seen_movie_ids) >= MIN_ONBOARDING_MOVIES:
                    break # 목표 개수를 채우면 중단
                
                if isinstance(response, httpx.Response) and response.status_code == 200:
                    data = response.json()
                    genre_name = fallback_genre_names[i % len(fallback_genre_names)]
                    
                    for movie in data.get("results", []):
                        if movie.get("poster_path") and movie["id"] not in seen_movie_ids:
                            movie_candidates.append({
                                "movie_id": movie["id"], "title": movie["title"],
                                "poster_url": get_full_poster_url(movie['poster_path']),
                                "genre_name": genre_name
                            })
                            seen_movie_ids.add(movie["id"])
                            if len(seen_movie_ids) >= MIN_ONBOARDING_MOVIES:
                                break
    
    # 3. 수집된 영화들의 출연진 정보 병렬로 가져오기
    actor_map = {}
    async with httpx.AsyncClient() as client:
        tasks = []
        for movie in movie_candidates:
            movie_id = movie["movie_id"]
            credits_url = f"{TMDB_API_BASE_URL}/movie/{movie_id}/credits"
            params = {"api_key": TMDB_API_KEY, "language": "ko-KR"}
            tasks.append(client.get(credits_url, params=params))

        credits_responses = await asyncio.gather(*tasks, return_exceptions=True)

        for i, response in enumerate(credits_responses):
            movie_id = movie_candidates[i]["movie_id"]
            if isinstance(response, httpx.Response) and response.status_code == 200:
                credits_data = response.json()
                top_actors = [actor['name'] for actor in credits_data.get('cast', [])[:2]]
                actor_map[movie_id] = top_actors
            else:
                actor_map[movie_id] = []

    # 4. 최종 영화 목록에 배우 정보 결합
    onboarding_movies = []
    for movie in movie_candidates:
        movie['actors'] = actor_map.get(movie['movie_id'], [])
        onboarding_movies.append(movie)

    random.shuffle(onboarding_movies)
    return onboarding_movies

# This function was accidentally deleted in a previous step. Restoring it now.
async def get_details_for_movies(ids: List[int]) -> List[dict]:
    """
    주어진 영화 ID 목록에 대한 상세 정보(키워드, 개봉일 포함)를 TMDB에서 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        tasks = []
        for movie_id in ids:
            details_url = f"{TMDB_API_BASE_URL}/movie/{movie_id}"
            keywords_url = f"{TMDB_API_BASE_URL}/movie/{movie_id}/keywords"
            params = {"api_key": TMDB_API_KEY, "language": "ko-KR"}
            
            tasks.append(client.get(details_url, params=params))
            tasks.append(client.get(keywords_url, params={"api_key": TMDB_API_KEY}))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    detailed_movies = []
    for i in range(0, len(responses), 2):
        details_res = responses[i]
        keywords_res = responses[i+1]

        if isinstance(details_res, httpx.Response) and details_res.status_code == 200:
            movie = details_res.json()
            keywords = []
            if isinstance(keywords_res, httpx.Response) and keywords_res.status_code == 200:
                keywords = [kw['name'] for kw in keywords_res.json().get('keywords', [])]

            if movie.get('poster_path'):
                detailed_movies.append({
                    "movie_id": movie["id"],
                    "title": movie["title"],
                    "poster_url": get_full_poster_url(movie.get('poster_path')),
                    "genre_name": movie["genres"][0]["name"] if movie.get("genres") else "기타",
                    "release_date": movie.get("release_date"),
                    "keywords": keywords
                })
    return detailed_movies

def search_person_on_tmdb(name: str) -> dict | None:
    """
    TMDB에서 이름으로 인물을 검색하고 첫 번째 결과를 반환합니다.
    """
    if not TMDB_API_KEY:
        return None

    url = f"{TMDB_API_BASE_URL}/search/person"
    params = {
        "api_key": TMDB_API_KEY,
        "query": name,
        "language": "ko-KR"
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        results = response.json().get('results')
        if results:
            return results[0]
        return None
    except requests.RequestException as e:
        print(f"TMDB 인물 검색 중 오류 발생: {e}")
        return None

async def search_movies_by_query(query: str) -> List[dict]:
    """
    TMDB에서 검색 쿼리로 영화 목록을 검색합니다.
    """
    async with httpx.AsyncClient() as client:
        url = f"{TMDB_API_BASE_URL}/search/movie"
        params = {
            "api_key": TMDB_API_KEY,
            "query": query,
            "language": "ko-KR",
            "region": "KR",
            "page": 1
        }
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            results = response.json().get("results", [])
            
            searched_movies = []
            for movie in results:
                if movie.get("poster_path"):
                    searched_movies.append({
                        "id": movie["id"],
                        "title": movie["title"],
                        "poster_url": get_full_poster_url(movie.get('poster_path')),
                        "release_date": movie.get("release_date"),
                        "overview": movie.get("overview"),
                        "vote_average": movie.get("vote_average")
                    })
            return searched_movies
        except httpx.HTTPStatusError as e:
            print(f"TMDB 검색 API 오류 발생: {e.response.status_code}")
            return []
        except Exception as e:
            print(f"TMDB 영화 검색 중 예외 발생: {e}")
            return []

async def get_trending_movies(time_window: str = 'week', page: int = 1) -> List[dict]:
    """
    TMDB에서 트렌딩 영화 목록을 가져옵니다. (주간/일간)
    """
    async with httpx.AsyncClient() as client:
        url = f"{TMDB_API_BASE_URL}/trending/movie/{time_window}"
        params = {"api_key": TMDB_API_KEY, "language": "ko-KR", "region": "KR", "page": page}
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            results = response.json().get("results", [])
            
            trending_movies = []
            for movie in results:
                if movie.get("poster_path"):
                    trending_movies.append({"id": movie["id"], "title": movie["title"], "poster_url": get_full_poster_url(movie.get('poster_path')), "release_date": movie.get("release_date"), "overview": movie.get("overview"), "vote_average": movie.get("vote_average")})
            return trending_movies
        except httpx.HTTPStatusError as e:
            print(f"TMDB 트렌딩 API 오류: {e.response.status_code}")
            return []
        except Exception as e:
            print(f"TMDB 트렌딩 영화 조회 중 예외 발생: {e}")
            return []

async def get_now_playing_movies(page: int = 1) -> List[dict]:
    """
    TMDB에서 현재 상영중인 영화 목록을 가져옵니다.
    """
    # ... (Implementation similar to get_trending_movies)
    return []

async def get_top_rated_movies(page: int = 1) -> List[dict]:
    """
    TMDB에서 역대 평점 높은 영화 목록을 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        url = f"{TMDB_API_BASE_URL}/movie/top_rated"
        params = {
            "api_key": TMDB_API_KEY,
            "language": "ko-KR",
            "region": "KR",
            "page": page
        }
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            results = response.json().get("results", [])
            
            top_rated_movies = []
            for movie in results:
                if movie.get("poster_path"):
                    top_rated_movies.append({
                        "id": movie["id"],
                        "title": movie["title"],
                        "poster_url": get_full_poster_url(movie.get('poster_path')),
                        "release_date": movie.get("release_date"),
                        "overview": movie.get("overview"),
                        "vote_average": movie.get("vote_average")
                    })
            return top_rated_movies
        except httpx.HTTPStatusError as e:
            print(f"TMDB 평점 높은 영화 API 오류 발생: {e.response.status_code}")
            return []
        except Exception as e:
            print(f"TMDB 평점 높은 영화 조회 중 예외 발생: {e}")
            return []

async def get_watch_providers(tmdb_id: int) -> dict:
    """
    TMDB에서 특정 영화의 한국 스트리밍 서비스 제공자 목록과 대표 '보러가기' 링크를 함께 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        url = f"{TMDB_API_BASE_URL}/movie/{tmdb_id}/watch/providers"
        params = {"api_key": TMDB_API_KEY}
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            results = response.json().get("results", {})
            kr_results = results.get("KR", {})
            link = kr_results.get("link")
            providers = kr_results.get("flatrate", [])
            
            provider_list = [{"provider_name": provider.get("provider_name"), "logo_url": get_full_poster_url(provider.get("logo_path"))} for provider in providers]
            return {"link": link, "providers": provider_list}
        except httpx.HTTPStatusError as e:
            if e.response.status_code != 404:
                print(f"TMDB Watch Providers API 오류: {e.response.status_code}")
            return {"link": None, "providers": []}
        except Exception as e:
            print(f"TMDB Watch Providers 조회 중 예외: {e}")
            return {"link": None, "providers": []}

async def get_movie_details_by_tmdb_id(tmdb_id: int) -> dict | None:
    """
    TMDB ID를 사용하여 영화의 상세 정보(감독, 배우, OTT 포함)를 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        details_url = f"{TMDB_API_BASE_URL}/movie/{tmdb_id}"
        credits_url = f"{TMDB_API_BASE_URL}/movie/{tmdb_id}/credits"
        params = {"api_key": TMDB_API_KEY, "language": "ko-KR"}
        
        try:
            details_task = client.get(details_url, params=params)
            credits_task = client.get(credits_url, params=params)
            providers_task = get_watch_providers(tmdb_id)
            
            responses = await asyncio.gather(details_task, credits_task, providers_task, return_exceptions=True)
            
            details_res, credits_res, provider_data = responses
            
            if isinstance(details_res, Exception) or details_res.status_code != 200: return None
            if isinstance(credits_res, Exception) or credits_res.status_code != 200: return None

            details = details_res.json()
            credits = credits_res.json()

            director = next((person['name'] for person in credits.get('crew', []) if person.get('job') == 'Director'), "N/A")
            actors = [person['name'] for person in credits.get('cast', [])[:5]]

            return {
                "id": str(details.get("id")), "title": details.get("title"), "release": details.get("release_date"), "runtime": details.get("runtime"),
                "genres": [genre['name'] for genre in details.get('genres', [])], "directors": [director], "actors": actors,
                "synopsis": details.get("overview") or "줄거리 정보가 없습니다.", "poster_url": get_full_poster_url(details.get('poster_path')),
                "backdrop_url": get_full_poster_url(details.get('backdrop_path'), size='w780'),
                "watch_link": provider_data.get("link") if isinstance(provider_data, dict) else None,
                "watch_providers": provider_data.get("providers") if isinstance(provider_data, dict) else []
            }
        except Exception as e:
            print(f"TMDB 상세 정보 조회 중 예외: {e}")
            return None

async def _get_movies_by_genre_base(genre_id: int, page: int, region: str | None, vote_count_gte: int) -> List[dict]:
    """Base function to fetch movies by genre with specific filters."""
    async with httpx.AsyncClient() as client:
        url = f"{TMDB_API_BASE_URL}/discover/movie"
        params = {
            "api_key": TMDB_API_KEY,
            "with_genres": str(genre_id),
            "sort_by": "popularity.desc",
            "language": "ko-KR",
            "page": page,
            "vote_count.gte": vote_count_gte,
        }
        if region:
            params["region"] = region
        
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            results = response.json().get("results", [])
            
            movies = []
            for movie in results:
                if movie.get("poster_path"):
                    movies.append({
                        "id": movie["id"],
                        "title": movie["title"],
                        "poster_url": get_full_poster_url(movie.get('poster_path')),
                        "release_date": movie.get("release_date"),
                        "overview": movie.get("overview"),
                        "vote_average": movie.get("vote_average")
                    })
            return movies
        except httpx.HTTPStatusError as e:
            # 404 is not an error in this context, just no results
            if e.response.status_code != 404:
                print(f"TMDB 장르별 영화 API 오류: {e.response.status_code}")
            return []
        except Exception as e:
            print(f"TMDB 장르별 영화 조회 중 예외 발생: {e}")
            return []

async def get_movies_by_genre(genre_id: int, page: int = 1) -> List[dict]:
    """
    TMDB에서 특정 장르의 인기 영화 목록을 가져옵니다. 
    결과가 부족할 경우, 지능형 폴백 로직을 사용하여 조건을 완화하며 재검색합니다.
    """
    # '더보기' 페이지의 무한 스크롤을 위해, page > 1 에서는 넓게 검색
    if page > 1:
        return await _get_movies_by_genre_base(genre_id, page, region=None, vote_count_gte=10)

    MIN_RESULTS = 5
    
    # 1순위: 한국 인기 영화
    results = await _get_movies_by_genre_base(genre_id, page, region="KR", vote_count_gte=100)
    if len(results) >= MIN_RESULTS:
        return results

    # 2순위: 전 세계 인기 영화
    results = await _get_movies_by_genre_base(genre_id, page, region=None, vote_count_gte=100)
    if len(results) >= MIN_RESULTS:
        return results

    # 3순위: 한국 숨은 영화
    results = await _get_movies_by_genre_base(genre_id, page, region="KR", vote_count_gte=10)
    if len(results) >= MIN_RESULTS:
        return results
    
    # 4순위: 모든 영화 (최후의 보루)
    results = await _get_movies_by_genre_base(genre_id, page, region=None, vote_count_gte=0)
    return results

async def get_recent_releases(days_ago: int = 7) -> List[dict]:
    """
    TMDB에서 최근 N일 동안 개봉한 영화 목록을 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        today = datetime.now()
        start_date = (today - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        url = f"{TMDB_API_BASE_URL}/discover/movie"
        params = {
            "api_key": TMDB_API_KEY,
            "language": "ko-KR",
            "region": "KR",
            "primary_release_date.gte": start_date,
            "primary_release_date.lte": end_date,
            "with_release_type": "3|2",  # 극장 개봉
            "sort_by": "popularity.desc"
        }
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            results = response.json().get("results", [])
            
            movies = []
            for movie in results:
                if movie.get("poster_path"):
                    movies.append({
                        "id": movie["id"],
                        "title": movie["title"],
                        "poster_url": get_full_poster_url(movie.get('poster_path')),
                        "release_date": movie.get("release_date"),
                        "overview": movie.get("overview"),
                        "vote_average": movie.get("vote_average")
                    })
            return movies
        except httpx.HTTPStatusError as e:
            print(f"TMDB 신작 영화 API 오류: {e.response.status_code}")
            return []
        except Exception as e:
            print(f"TMDB 신작 영화 조회 중 예외 발생: {e}")
            return []

async def get_movies_for_home_mood(keywords: List[str]) -> List[dict]:
    """
    홈 화면의 감성 큐레이션을 위한 안정적인 영화 후보군을 가져옵니다.
    여러 페이지를 동시에 조회하여 편차를 줄입니다.
    """
    genre_ids = [str(GENRE_IDS[keyword]) for keyword in keywords if keyword in GENRE_IDS]
    if not genre_ids:
        # 키워드가 없을 경우, 인기 영화를 반환하는 로직 (예시)
        print("[DEBUG-TMDB] No keywords provided, fetching general popular movies.")
        return await get_trending_movies()

    genre_id_string = ",".join(genre_ids)
    
    pages_to_fetch = [1, 2, 3] # 상위 3개 페이지를 조회
    tasks = []
    
    async with httpx.AsyncClient() as client:
        for page in pages_to_fetch:
            url = f"{TMDB_API_BASE_URL}/discover/movie"
            params = {
                "api_key": TMDB_API_KEY,
                "with_genres": genre_id_string,
                "sort_by": "popularity.desc",
                "language": "ko-KR",
                "page": page,
            }
            tasks.append(client.get(url, params=params))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    combined_results = []
    seen_movie_ids = set()

    for response in responses:
        if isinstance(response, httpx.Response) and response.status_code == 200:
            results = response.json().get("results", [])
            for movie in results:
                # 중복 추가 방지
                if movie.get("id") not in seen_movie_ids and movie.get("poster_path"):
                    combined_results.append({
                        "id": movie["id"],
                        "title": movie["title"],
                        "poster_url": get_full_poster_url(movie.get('poster_path')),
                        "release_date": movie.get("release_date"),
                        "overview": movie.get("overview"),
                        "vote_average": movie.get("vote_average")
                    })
                    seen_movie_ids.add(movie["id"])
        elif isinstance(response, Exception):
            print(f"TMDB 감성 추천 병렬 요청 중 예외 발생: {response}")

    print(f"[DEBUG-TMDB] Mood search for {keywords} from pages {pages_to_fetch} returned {len(combined_results)} unique movies.")
    
    return combined_results