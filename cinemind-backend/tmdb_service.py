# tmdb_service.py
import os
import requests
import httpx
import asyncio
import random
from typing import List

TMDB_API_KEY = os.getenv('TMDB_API_KEY')
TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'

# TMDB 장르 ID
GENRE_IDS = {
    "액션": 28, "모험": 12, "애니메이션": 16, "코미디": 35,
    "드라마": 18, "가족": 10751, "판타지": 14, "역사": 36,
    "음악": 10402, "미스터리": 9648, "로맨스": 10749,
    "SF": 878, "스릴러": 53, "다큐멘터리": 99
}

# 기분과 장르 ID 목록 매핑
MOOD_GENRE_MAP = {
    "신나는": [GENRE_IDS["액션"], GENRE_IDS["모험"], GENRE_IDS["코미디"]],
    "행복한": [GENRE_IDS["코미디"], GENRE_IDS["로맨스"], GENRE_IDS["음악"], GENRE_IDS["가족"]],
    "위로가 필요한": [GENRE_IDS["드라마"], GENRE_IDS["로맨스"], GENRE_IDS["애니메이션"]],
    "생각이 많은": [GENRE_IDS["SF"], GENRE_IDS["미스터리"], GENRE_IDS["드라마"], GENRE_IDS["다큐멘터리"]]
}

# 기본값 (mood가 지정되지 않았을 경우)
DEFAULT_ONBOARDING_GENRES = [
    GENRE_IDS["액션"], GENRE_IDS["로맨스"], GENRE_IDS["코미디"],
    GENRE_IDS["SF"], GENRE_IDS["애니메이션"], GENRE_IDS["스릴러"]
]

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
            return results[0]  # 가장 정확도가 높은 첫 번째 결과를 반환
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

def get_full_poster_url(poster_path: str, size: str = 'w500'):
    """
    포스터 경로와 사이즈를 받아 전체 이미지 URL을 생성합니다.
    """
    if not poster_path:
        return None
    return f"https://image.tmdb.org/t/p/{size}{poster_path}"

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


async def get_movies_for_onboarding(mood: str | None) -> List[dict]:
    """
    온보딩 스와이프 화면을 위한 다양한 장르의 영화 목록을 가져옵니다.
    주어진 mood에 따라 관련된 장르의 영화를 필터링합니다.
    """
    target_genre_ids = MOOD_GENRE_MAP.get(mood, DEFAULT_ONBOARDING_GENRES)
    
    # ID로부터 장르 이름을 찾기 위한 역방향 맵
    id_to_genre_name_map = {v: k for k, v in GENRE_IDS.items()}

    onboarding_movies = []
    seen_movie_ids = set()
    async with httpx.AsyncClient() as client:
        tasks = []
        for genre_id in target_genre_ids:
            url = f"{TMDB_API_BASE_URL}/discover/movie"
            params = {
                "api_key": TMDB_API_KEY,
                "with_genres": genre_id,
                "sort_by": "popularity.desc",
                "language": "ko-KR",
                "page": 1,
                "region": "KR",
                "vote_count.gte": 100
            }
            tasks.append(client.get(url, params=params))

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for i, response in enumerate(responses):
            if isinstance(response, httpx.Response) and response.status_code == 200:
                data = response.json()
                current_genre_id = target_genre_ids[i]
                genre_name = id_to_genre_name_map.get(current_genre_id, "기타")
                
                # 각 장르별로 인기 영화 3개를 후보로 올림
                for movie in data.get("results", [])[:3]:
                    if movie.get("poster_path") and movie["id"] not in seen_movie_ids:
                        onboarding_movies.append({
                            "movie_id": movie["id"],
                            "title": movie["title"],
                            "poster_url": get_full_poster_url(movie['poster_path']),
                            "genre_name": genre_name
                        })
                        seen_movie_ids.add(movie["id"])
    
    random.shuffle(onboarding_movies)
    return onboarding_movies

async def get_details_for_movies(ids: List[int]) -> List[dict]:
    """
    주어진 영화 ID 목록에 대한 상세 정보를 TMDB에서 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        tasks = []
        for movie_id in ids:
            url = f"{TMDB_API_BASE_URL}/movie/{movie_id}"
            params = {"api_key": TMDB_API_KEY, "language": "ko-KR"}
            tasks.append(client.get(url, params=params))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    detailed_movies = []
    for response in responses:
        if isinstance(response, httpx.Response) and response.status_code == 200:
            movie = response.json()
            if movie.get('poster_path'):
                detailed_movies.append({
                    "movie_id": movie["id"],
                    "title": movie["title"],
                    "poster_url": get_full_poster_url(movie.get('poster_path')),
                    "genre_name": movie["genres"][0]["name"] if movie.get("genres") else "기타"
                })
    return detailed_movies

async def get_trending_movies(time_window: str = 'week', page: int = 1) -> List[dict]:
    """
    TMDB에서 트렌딩 영화 목록을 가져옵니다. (주간/일간)
    """
    async with httpx.AsyncClient() as client:
        url = f"{TMDB_API_BASE_URL}/trending/movie/{time_window}"
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
            
            trending_movies = []
            for movie in results:
                if movie.get("poster_path"):
                    trending_movies.append({
                        "id": movie["id"],
                        "title": movie["title"],
                        "poster_url": get_full_poster_url(movie.get('poster_path')),
                        "release_date": movie.get("release_date"),
                        "overview": movie.get("overview"),
                        "vote_average": movie.get("vote_average")
                    })
            return trending_movies
        except httpx.HTTPStatusError as e:
            print(f"TMDB 트렌딩 API 오류 발생: {e.response.status_code}")
            return []
        except Exception as e:
            print(f"TMDB 트렌딩 영화 조회 중 예외 발생: {e}")
            return []

async def get_now_playing_movies(page: int = 1) -> List[dict]:
    """
    TMDB에서 현재 상영중인 영화 목록을 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        url = f"{TMDB_API_BASE_URL}/movie/now_playing"
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
            
            now_playing_movies = []
            for movie in results:
                if movie.get("poster_path"):
                    now_playing_movies.append({
                        "id": movie["id"],
                        "title": movie["title"],
                        "poster_url": get_full_poster_url(movie.get('poster_path')),
                        "release_date": movie.get("release_date"),
                        "overview": movie.get("overview"),
                        "vote_average": movie.get("vote_average")
                    })
            return now_playing_movies
        except httpx.HTTPStatusError as e:
            print(f"TMDB 현재 상영중 API 오류 발생: {e.response.status_code}")
            return []
        except Exception as e:
            print(f"TMDB 현재 상영중 영화 조회 중 예외 발생: {e}")
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

async def get_movie_details_by_tmdb_id(tmdb_id: int) -> dict | None:
    """
    TMDB ID를 사용하여 영화의 상세 정보(감독, 배우 포함)를 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        details_url = f"{TMDB_API_BASE_URL}/movie/{tmdb_id}"
        credits_url = f"{TMDB_API_BASE_URL}/movie/{tmdb_id}/credits"
        params = {"api_key": TMDB_API_KEY, "language": "ko-KR"}
        
        try:
            details_task = client.get(details_url, params=params)
            credits_task = client.get(credits_url, params=params)
            
            responses = await asyncio.gather(details_task, credits_task, return_exceptions=True)
            
            details_res, credits_res = responses
            
            if isinstance(details_res, Exception):
                print(f"TMDB details_res에서 예외 발생: {details_res}")
                return None
            if details_res.status_code != 200:
                print(f"TMDB details_res 상태 코드 에러: {details_res.status_code}")
                return None
            
            if isinstance(credits_res, Exception):
                print(f"TMDB credits_res에서 예외 발생: {credits_res}")
                return None
            if credits_res.status_code != 200:
                print(f"TMDB credits_res 상태 코드 에러: {credits_res.status_code}")
                return None

            details = details_res.json()
            credits = credits_res.json()

            # 감독 찾기
            director = next((person['name'] for person in credits.get('crew', []) if person.get('job') == 'Director'), "N/A")
            
            # 주연 배우 5명 찾기
            actors = [person['name'] for person in credits.get('cast', [])[:5]]

            return {
                "title": details.get("title"),
                "release": details.get("release_date"),
                "runtime": details.get("runtime"),
                "genres": [genre['name'] for genre in details.get('genres', [])],
                "directors": [director],
                "actors": actors,
                "synopsis": details.get("overview") or "줄거리 정보가 없습니다.",
                "poster_url": get_full_poster_url(details.get('poster_path')),
                "backdrop_url": get_full_poster_url(details.get('backdrop_path'), size='w780')
            }

        except Exception as e:
            print(f"TMDB 상세 정보 조회 중 예외 발생 (ID: {tmdb_id}): {e}")
            return None

async def get_movies_by_genre(genre_id: int, page: int = 1) -> List[dict]:
    """
    TMDB에서 특정 장르의 인기 영화 목록을 가져옵니다.
    """
    async with httpx.AsyncClient() as client:
        url = f"{TMDB_API_BASE_URL}/discover/movie"
        params = {
            "api_key": TMDB_API_KEY,
            "with_genres": genre_id,
            "sort_by": "popularity.desc",
            "language": "ko-KR",
            "region": "KR",
            "page": page,
            "vote_count.gte": 100 # 최소 투표 수가 100개 이상인 영화만
        }
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            results = response.json().get("results", [])
            
            genre_movies = []
            for movie in results:
                if movie.get("poster_path"):
                    genre_movies.append({
                        "id": movie["id"],
                        "title": movie["title"],
                        "poster_url": get_full_poster_url(movie.get('poster_path')),
                        "release_date": movie.get("release_date"),
                        "overview": movie.get("overview"),
                        "vote_average": movie.get("vote_average")
                    })
            return genre_movies
        except httpx.HTTPStatusError as e:
            print(f"TMDB 장르별 영화 API 오류 발생: {e.response.status_code}")
            return []
        except Exception as e:
            print(f"TMDB 장르별 영화 조회 중 예외 발생: {e}")
            return []