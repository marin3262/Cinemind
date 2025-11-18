from fastapi import APIRouter, HTTPException
from supabase_client import supabase_admin
import httpx
import os
from recommendation_service import train_and_save_content_similarity

router = APIRouter(
    prefix="/utils",
    tags=["Utilities"]
)

TMDB_API_KEY = os.getenv('TMDB_API_KEY')
TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'

def get_full_poster_url(poster_path: str, size: str = 'w500'):
    if not poster_path:
        return None
    return f"https://image.tmdb.org/t/p/{size}{poster_path}"

# This is a temporary endpoint for development purposes to seed the database.
@router.post("/seed-movies", status_code=201)
async def seed_movies(pages: int = 10):
    """
    Fetches popular movies from TMDB and seeds them into the 'movies' table.
    Ensures that no duplicate movies are inserted in the same batch.
    """
    print(f"Starting to seed database with up to {pages * 20} movies from TMDB...")
    unique_movies = {}  # Use a dictionary to handle duplicates automatically
    
    async with httpx.AsyncClient() as client:
        for page in range(1, pages + 1):
            url = f"{TMDB_API_BASE_URL}/movie/popular"
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
                
                for movie in results:
                    if movie.get("poster_path"):
                        movie_id_str = str(movie["id"])
                        # By using the ID as a key, we overwrite any duplicates.
                        unique_movies[movie_id_str] = {
                            "id": movie_id_str,
                            "title": movie["title"],
                            "release_date": movie.get("release_date"),
                            "poster_url": get_full_poster_url(movie.get('poster_path')),
                            "synopsis": movie.get("overview"),
                        }
            except httpx.HTTPStatusError as e:
                print(f"Error fetching page {page} from TMDB: {e.response.status_code}")
                continue
            except Exception as e:
                print(f"An unexpected error occurred while fetching page {page}: {e}")
                continue

    if not unique_movies:
        raise HTTPException(status_code=500, detail="No movies could be fetched from TMDB.")

    movies_to_upsert = list(unique_movies.values())

    try:
        print(f"Upserting {len(movies_to_upsert)} unique movies into the database...")
        supabase_admin.table('movies').upsert(movies_to_upsert, on_conflict='id').execute()
        return {"message": f"Successfully seeded database with {len(movies_to_upsert)} unique movies."}
    except Exception as e:
        print(f"Error upserting movies into database: {e}")
        raise HTTPException(status_code=500, detail=f"Database upsert failed: {str(e)}")

@router.post("/train-content-similarity", status_code=200)
async def train_content_similarity_endpoint():
    """
    Triggers the training and saving of content-based movie similarities.
    """
    print("콘텐츠 기반 유사도 모델 학습을 시작합니다...")
    await train_and_save_content_similarity()
    print("콘텐츠 기반 유사도 모델 학습 완료.")
    return {"message": "콘텐츠 기반 유사도 모델 학습이 성공적으로 완료되었습니다."}

