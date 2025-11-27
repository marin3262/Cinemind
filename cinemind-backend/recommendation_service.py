# recommendation_service.py
import json
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from supabase_client import supabase, supabase_admin
from kobis_service import get_daily_box_office, get_movie_details
from collections import Counter
from typing import List, Dict, Optional

from collections import Counter
from typing import List, Dict, Optional, Tuple

# --- NEW HYBRID RECOMMENDATION LOGIC FOR HOME SCREEN ---

def _get_similarity_data() -> Tuple[Dict, Dict]:
    """Helper to fetch cached similarity data from the DB."""
    try:
        collab_sim_res = supabase_admin.table('cached_lists').select('data').eq('list_type', "movie_top_k_similarities").single().execute()
        collab_similarities = json.loads(collab_sim_res.data['data']) if collab_sim_res.data and collab_sim_res.data.get('data') else {}
    except Exception:
        collab_similarities = {}

    try:
        content_sim_res = supabase_admin.table('cached_lists').select('data').eq('list_type', "content_similar_top_k").single().execute()
        content_similarities = json.loads(content_sim_res.data['data']) if content_sim_res.data and content_sim_res.data.get('data') else {}
    except Exception:
        content_similarities = {}
        
    return collab_similarities, content_similarities

def _calculate_hybrid_scores(user_id: str) -> Tuple[Optional[Counter], set]:
    """Calculates hybrid recommendation scores for all movies based on a user's ratings."""
    collab_similarities, content_similarities = _get_similarity_data()
    if not collab_similarities and not content_similarities:
        print("[Warning] Similarity data not found. Cannot calculate taste scores.")
        return None, set()

    ratings_response = supabase_admin.table('user_ratings').select('movie_id, rating').eq('user_id', user_id).execute()
    user_ratings = {item['movie_id']: item['rating'] for item in ratings_response.data}
    seen_movie_ids = set(user_ratings.keys())
    
    highly_rated_movies = {movie_id: rating for movie_id, rating in user_ratings.items() if rating >= 4}
    if not highly_rated_movies:
        return Counter(), seen_movie_ids

    hybrid_scores = Counter()
    COLLAB_WEIGHT = 0.6
    CONTENT_WEIGHT = 0.4

    for movie_id, rating in highly_rated_movies.items():
        # Collaborative filtering scores
        if movie_id in collab_similarities:
            for similar_movie in collab_similarities.get(movie_id, []):
                hybrid_scores[similar_movie["id"]] += similar_movie["score"] * (rating - 3.5) * COLLAB_WEIGHT
        
        # Content-based filtering scores
        if movie_id in content_similarities:
            for similar_movie in content_similarities.get(movie_id, []):
                hybrid_scores[similar_movie["id"]] += similar_movie["score"] * (rating - 3.5) * CONTENT_WEIGHT
    
    # Filter out movies the user has already seen
    for seen_id in seen_movie_ids:
        if seen_id in hybrid_scores:
            del hybrid_scores[seen_id]
            
    return hybrid_scores, seen_movie_ids

async def get_home_hybrid_recommendations(user_id: str, mood_keywords: List[str], top_n: int = 20) -> List[str]:
    """
    Generates hybrid recommendations for the home screen by re-ranking mood-based
    candidates with the user's personal taste scores.
    """
    from tmdb_service import get_movies_for_home_mood
    
    print(f"--- 홈 화면 하이브리드 추천 생성 시작 (사용자: {user_id}, 기분: {mood_keywords}) ---")
    
    scores, seen_movie_ids = _calculate_hybrid_scores(user_id)
    print(f"[DEBUG] 1. 사용자 평점 기반 취향 점수 계산 완료. (본 영화: {len(seen_movie_ids)}편)")
    
    if scores is None:
        print("[DEBUG] 2. 취향 점수 모델을 찾을 수 없어, TMDB 인기 영화로 대체합니다.")
        movies = await get_movies_for_home_mood(mood_keywords)
        return [str(m['id']) for m in movies]

    # Get mood-based candidates
    mood_candidate_movies = await get_movies_for_home_mood(mood_keywords)
    print(f"[DEBUG] 2. 선택한 기분({mood_keywords})에 맞는 영화 후보군 {len(mood_candidate_movies)}편을 TMDB에서 가져옴.")
    
    if not mood_candidate_movies:
        return []

    # Re-rank candidates based on user's taste scores
    reranked_movies = []
    for movie in mood_candidate_movies:
        movie_id = str(movie['id'])
        if movie_id not in seen_movie_ids:
            score = scores.get(movie_id, 0)
            reranked_movies.append((movie, score))
    
    print(f"[DEBUG] 3. 이미 본 영화를 제외하고, 추천 후보군 {len(reranked_movies)}편이 남음.")
            
    # Sort by personal taste score (descending)
    reranked_movies.sort(key=lambda x: x[1], reverse=True)
    
    # Extract IDs from the sorted list
    final_recommendation_ids = [str(movie_tuple[0]['id']) for movie_tuple in reranked_movies]
    print(f"[DEBUG] 4. 취향 점수 순으로 정렬된 최종 후보군: {len(final_recommendation_ids)}편")
    
    # If results are still not enough, use fallback
    if len(final_recommendation_ids) < top_n:
        print(f"[DEBUG] 5. 추천 결과가 {top_n}편보다 적어, 대체 추천 로직을 실행합니다.")
        fallback_recs = await get_fallback_recommendations(user_id, seen_movie_ids.union(set(final_recommendation_ids)), top_n)
        final_recommendation_ids.extend(fallback_recs)
        final_recommendation_ids = list(dict.fromkeys(final_recommendation_ids)) # 중복 제거

    final_results = final_recommendation_ids[:top_n]
    print(f"[DEBUG] 6. 최종 추천 영화 목록 ({len(final_results)}편): {final_results}")
    return final_results


def train_and_save_similarity_matrix(top_k: int = 50):
    """
    Fetches all user ratings, calculates movie-movie similarity, and saves only the
    top-K most similar movies for each movie to the 'cached_lists' table.
    """
    print("Starting recommendation model training (Top-K)...")
    try:
        # 1. Fetch all ratings
        response = supabase_admin.table('user_ratings').select('user_id, movie_id, rating').execute()
        if not response.data:
            print("No rating data available to train the model.")
            return

        ratings_df = pd.DataFrame(response.data)

        # 2. Create the user-item matrix
        user_item_matrix = ratings_df.pivot_table(index='user_id', columns='movie_id', values='rating').fillna(0)
        
        if user_item_matrix.shape[1] < 2:
            print("Not enough unique movies rated to build a model.")
            return

        # 3. Calculate the full cosine similarity matrix
        movie_similarity_matrix = cosine_similarity(user_item_matrix.T)
        movie_ids = user_item_matrix.columns.tolist()
        
        # 4. Create the Top-K similarity dictionary
        top_k_similarities = {}
        for i, movie_id in enumerate(movie_ids):
            # Get similarity scores for the current movie with all other movies
            similarity_scores = movie_similarity_matrix[i]
            
            # Get the indices of the top K+1 most similar movies (including itself)
            top_indices = np.argsort(similarity_scores)[::-1][1:top_k+1]
            
            similar_movies = []
            for index in top_indices:
                similar_movies.append({
                    "id": movie_ids[index],
                    "score": similarity_scores[index]
                })
            
            top_k_similarities[movie_id] = similar_movies

        # 5. Save the new Top-K structure to the cached_lists table
        list_type = "movie_top_k_similarities"
        supabase_admin.table('cached_lists').upsert(
            {
                "list_type": list_type,
                "data": json.dumps(top_k_similarities),
                "last_updated": pd.Timestamp.now().isoformat()
            },
            on_conflict='list_type'
        ).execute()

        print(f"Successfully trained and saved Top-{top_k} similarities for {len(movie_ids)} movies.")

    except Exception as e:
        print(f"An error occurred during Top-K recommendation model training: {e}")

async def train_and_save_content_similarity(top_k: int = 50):
    """
    Fetches movie features, calculates content-based similarity, and saves only the
    top-K most similar movies for each movie to the 'cached_lists' table.
    """
    print("Starting content-based similarity training (Top-K)...")
    try:
        # 1. Fetch all movies with features from DB
        response = supabase_admin.table('movies').select('id, genres, keywords, director, actors, emotional_tags, synopsis').execute()
        if not response.data:
            print("No movie data with features available for content similarity training.")
            return

        movies_df = pd.DataFrame(response.data)
        
        # Filter out movies that don't have enough features
        movies_df = movies_df[movies_df['genres'].notna() | movies_df['keywords'].notna() | movies_df['director'].notna() | movies_df['actors'].notna() | movies_df['emotional_tags'].notna()]
        
        if movies_df.empty:
            print("No movies with sufficient features to build content similarity.")
            return

        # 2. Create a corpus for TF-IDF
        def create_corpus_document(row):
            parts = []
            if row['genres']:
                # Genres can be list of dicts or strings, convert to string names
                processed_genres = []
                for g in row['genres']:
                    if isinstance(g, dict) and 'name' in g:
                        processed_genres.append(g['name'])
                    elif isinstance(g, str):
                        processed_genres.append(g)
                parts.extend(processed_genres)
            if row['keywords']:
                parts.extend(row['keywords'])
            if row['director']:
                parts.append(row['director'])
            if row['actors']:
                parts.extend(row['actors'])
            if row['emotional_tags']:
                parts.extend(row['emotional_tags'])
            
            # Add synopsis words as well, but limit to avoid too much noise
            if row['synopsis']:
                synopsis_words = [word.strip(".,!?\"'()").lower() for word in row['synopsis'].split() if len(word.strip(".,!?\"'()")) > 1]
                parts.extend(synopsis_words[:20]) # Take top 20 words from synopsis
            
            return " ".join(parts)

        movies_df['corpus'] = movies_df.apply(create_corpus_document, axis=1)
        
        # Filter out movies with empty corpus
        movies_df = movies_df[movies_df['corpus'].str.strip() != '']

        if movies_df.empty:
            print("No movies with valid corpus for content similarity training.")
            return

        # 3. TF-IDF Vectorization
        tfidf_vectorizer = TfidfVectorizer()
        tfidf_matrix = tfidf_vectorizer.fit_transform(movies_df['corpus'])

        # 4. Calculate Cosine Similarity
        content_similarity_matrix = cosine_similarity(tfidf_matrix)
        movie_ids = movies_df['id'].tolist()

        # 5. Create the Top-K content similarity dictionary
        top_k_content_similarities = {}
        for i, movie_id in enumerate(movie_ids):
            similarity_scores = content_similarity_matrix[i]
            
            # Get the indices of the top K+1 most similar movies (excluding itself)
            top_indices = np.argsort(similarity_scores)[::-1][1:top_k+1]
            
            similar_movies = []
            for index in top_indices:
                similar_movies.append({
                    "id": movie_ids[index],
                    "score": similarity_scores[index]
                })
            
            top_k_content_similarities[movie_id] = similar_movies

        # 6. Save the new Top-K structure to the cached_lists table
        list_type = "content_similar_top_k"
        supabase_admin.table('cached_lists').upsert(
            {
                "list_type": list_type,
                "data": json.dumps(top_k_content_similarities),
                "last_updated": pd.Timestamp.now().isoformat()
            },
            on_conflict='list_type'
        ).execute()

        print(f"Successfully trained and saved Top-{top_k} content similarities for {len(movie_ids)} movies.")

    except Exception as e:
        print(f"An error occurred during content-based similarity training: {e}")

def get_fallback_recommendations(user_id: str, seen_movie_ids: set, top_n: int) -> List[str]:
    """
    Fallback recommendation logic: Recommend popular movies from the user's favorite genres.
    """
    print("[대체 추천 로직 실행] 개인화 추천을 생성할 수 없어, 장르 기반 인기 영화를 추천합니다.")
    try:
        # 1. Fetch all movies with genres from DB
        movies_res = supabase_admin.table('movies').select('id, genres').execute()
        if not movies_res.data:
            return []
        
        # 2. Find user's top 2 favorite genres
        user_ratings_res = supabase_admin.table('user_ratings').select('movie_id, rating').eq('user_id', user_id).gt('rating', 3).execute()
        if not user_ratings_res.data:
            # If no high ratings, just recommend popular movies
            popular_movies_res = supabase_admin.table('user_ratings').select('movie_id', count='exact').group('movie_id').order('count', desc=True).limit(top_n * 2).execute()
            return [m['movie_id'] for m in popular_movies_res.data if m['movie_id'] not in seen_movie_ids][:top_n]

        rated_movie_ids = [r['movie_id'] for r in user_ratings_res.data]
        
        movies_df = pd.DataFrame(movies_res.data)
        # Ensure 'id' in movies_df is the same type as rated_movie_ids (string)
        movies_df['id'] = movies_df['id'].astype(str)
        rated_movies_df = movies_df[movies_df['id'].isin(rated_movie_ids) & movies_df['genres'].notna()]

        if rated_movies_df.empty:
             return []

        genre_counter = Counter()
        for genres in rated_movies_df['genres']:
            if isinstance(genres, list):
                for genre in genres:
                    # Handle both {'id': 1, 'name': 'Action'} and 'Action' formats
                    if isinstance(genre, dict) and 'name' in genre:
                        genre_counter[genre['name']] += 1
                    elif isinstance(genre, str):
                         genre_counter[genre] += 1

        top_genres = [g for g, count in genre_counter.most_common(2)]
        if not top_genres:
            return []
        
        print(f"사용자 선호 장르: {top_genres}")

        # 3. Recommend popular movies from those genres
        fallback_recs = []
        all_movies_df = pd.DataFrame(movies_res.data)
        all_movies_df['id'] = all_movies_df['id'].astype(str)

        for genre_name in top_genres:
            # Filter movies that have the genre_name in their genres list
            def has_genre(genres):
                if not isinstance(genres, list):
                    return False
                for g in genres:
                    if isinstance(g, dict) and g.get('name') == genre_name:
                        return True
                    if isinstance(g, str) and g == genre_name:
                        return True
                return False

            movies_with_genre = all_movies_df[all_movies_df['genres'].apply(has_genre)]
            
            for movie_id in movies_with_genre['id']:
                if movie_id not in seen_movie_ids:
                    fallback_recs.append(movie_id)
        
        return list(dict.fromkeys(fallback_recs))[:top_n]

    except Exception as e:
        print(f"[오류] 대체 추천 로직 실행 중 오류 발생: {e}")
        return []


async def get_recommendations_for_user(user_id: str, top_n: int = 20, mood_tag: Optional[str] = None):
    """
    Recommends movies for a user using a hybrid approach (collaborative + content-based).
    Handles cold-start for new users and applies mood filtering.
    """
    print(f"--- 하이브리드 추천 생성 시작: 사용자 ID {user_id}, 기분: {mood_tag} ---")
    
    # 1. (MOOD FILTER) Get movie IDs for the selected mood if provided
    mood_movie_ids = None
    if mood_tag:
        print(f"'{mood_tag}' 기분에 맞는 영화를 필터링합니다...")
        from llm_service import EMOTIONAL_TAGS
        target_tags = EMOTIONAL_TAGS.get(mood_tag, [])
        if not target_tags:
            print(f"'{mood_tag}'에 해당하는 감성 태그를 찾을 수 없습니다.")
            # Fallback to general recommendations if mood tag is invalid
            mood_tag = None 
        else:
            mood_movies_res = supabase_admin.table('movies').select('id').overlaps('emotional_tags', target_tags).execute()
            if not mood_movies_res.data:
                print(f"'{mood_tag}' 기분에 맞는 영화가 DB에 없습니다.")
                # Fallback to general recommendations if no movies match mood
                mood_tag = None
            else:
                mood_movie_ids = {str(movie['id']) for movie in mood_movies_res.data}
                print(f"기분 필터링된 영화 수: {len(mood_movie_ids)}")

    # 2. Load pre-computed similarity data
    try:
        collab_sim_res = supabase_admin.table('cached_lists').select('data').eq('list_type', "movie_top_k_similarities").single().execute()
        collab_similarities = json.loads(collab_sim_res.data['data']) if collab_sim_res.data else {}
    except Exception:
        collab_similarities = {}

    try:
        content_sim_res = supabase_admin.table('cached_lists').select('data').eq('list_type', "content_similar_top_k").single().execute()
        content_similarities = json.loads(content_sim_res.data['data']) if content_sim_res.data else {}
    except Exception:
        content_similarities = {}

    if not collab_similarities and not content_similarities:
        return {"message": "추천 모델이 아직 준비되지 않았습니다."}

    # 3. Get the user's ratings
    ratings_response = supabase_admin.table('user_ratings').select('movie_id, rating').eq('user_id', user_id).execute()
    user_ratings = {item['movie_id']: item['rating'] for item in ratings_response.data}
    seen_movie_ids = set(user_ratings.keys())

    # 4. Cold-start for new users (no ratings)
    if not user_ratings:
        print("[정보] 신규 사용자: 평점 데이터가 없어 온보딩 기반 콘텐츠 추천을 시도합니다.")
        onboarding_res = supabase_admin.table('profiles').select('onboarding_liked_movie_ids').eq('id', user_id).single().execute()
        onboarding_liked_ids = onboarding_res.data.get('onboarding_liked_movie_ids') if onboarding_res.data else []

        if onboarding_liked_ids and content_similarities:
            cold_start_recommendations = Counter()
            for liked_id in onboarding_liked_ids:
                liked_id_str = str(liked_id)
                if liked_id_str in content_similarities:
                    for similar_movie in content_similarities[liked_id_str]:
                        cold_start_recommendations[similar_movie["id"]] += similar_movie["score"]
            
            final_recs = [movie_id for movie_id, score in cold_start_recommendations.most_common(top_n * 2) if movie_id not in seen_movie_ids]
            
            if mood_movie_ids:
                final_recs = [rec_id for rec_id in final_recs if rec_id in mood_movie_ids]
            
            return final_recs[:top_n]
        else:
            print("[정보] 온보딩 데이터도 없어 일반적인 대체 추천을 제공합니다.")
            return await get_fallback_recommendations(user_id, seen_movie_ids, top_n)

    # 5. Calculate hybrid recommendation scores for existing users
    hybrid_scores = Counter()
    highly_rated_movies = {movie_id: rating for movie_id, rating in user_ratings.items() if rating >= 4}

    if not highly_rated_movies:
        print("[정보] 높은 평점 영화가 없어 대체 추천 로직을 실행합니다.")
        return await get_fallback_recommendations(user_id, seen_movie_ids, top_n)

    # Weights for hybrid scoring
    COLLAB_WEIGHT = 0.7
    CONTENT_WEIGHT = 0.3

    for movie_id, rating in highly_rated_movies.items():
        # Collaborative scores
        if movie_id in collab_similarities:
            for similar_movie in collab_similarities[movie_id]:
                hybrid_scores[similar_movie["id"]] += similar_movie["score"] * (rating - 3) * COLLAB_WEIGHT
        
        # Content-based scores
        if movie_id in content_similarities:
            for similar_movie in content_similarities[movie_id]:
                hybrid_scores[similar_movie["id"]] += similar_movie["score"] * (rating - 3) * CONTENT_WEIGHT

    # Filter out seen movies
    for seen_movie_id in seen_movie_ids:
        if seen_movie_id in hybrid_scores:
            del hybrid_scores[seen_movie_id]
    
    # Get initial list of recommended IDs
    recommended_movie_ids = [movie_id for movie_id, score in hybrid_scores.most_common(top_n * 5)]

    # (MOOD FILTER) Filter by mood
    if mood_movie_ids:
        final_recommendations = [rec_id for rec_id in recommended_movie_ids if rec_id in mood_movie_ids]
    else:
        final_recommendations = recommended_movie_ids
    
    final_recommendations = final_recommendations[:top_n]

    # If recommendations are still empty, use fallback
    if not final_recommendations:
        print("[정보] 개인화 추천 결과가 비어있어 대체 추천 로직을 실행합니다.")
        final_recommendations = await get_fallback_recommendations(user_id, seen_movie_ids, top_n)

    print(f"--- 최종 추천 영화 ID 목록 ({len(final_recommendations)}개): {final_recommendations} ---")
    return final_recommendations

async def get_fallback_recommendations(user_id: str, seen_movie_ids: set, top_n: int) -> List[str]:
    """
    Fallback recommendation logic: Recommend popular movies from the user's favorite genres.
    If no high ratings, just recommend globally popular movies.
    """
    print("[대체 추천 로직 실행] 개인화 추천을 생성할 수 없어, 장르 기반 인기 영화를 추천합니다.")
    try:
        # 1. Fetch all movies with genres from DB
        movies_res = supabase_admin.table('movies').select('id, genres').execute()
        if not movies_res.data:
            return []
        
        # 2. Find user's top 2 favorite genres
        user_ratings_res = supabase_admin.table('user_ratings').select('movie_id, rating').eq('user_id', user_id).gt('rating', 3).execute()
        
        if not user_ratings_res.data:
            # If no high ratings, just recommend globally popular movies
            print("[정보] 높은 평점 영화가 없어 전역 인기 영화를 추천합니다.")
            popular_movies_res = supabase_admin.table('movies').select('id').order('vote_average', desc=True).limit(top_n * 2).execute()
            return [m['id'] for m in popular_movies_res.data if m['id'] not in seen_movie_ids][:top_n]

        rated_movie_ids = [r['movie_id'] for r in user_ratings_res.data]
        
        movies_df = pd.DataFrame(movies_res.data)
        # Ensure 'id' in movies_df is the same type as rated_movie_ids (string)
        movies_df['id'] = movies_df['id'].astype(str)
        rated_movies_df = movies_df[movies_df['id'].isin(rated_movie_ids) & movies_df['genres'].notna()]

        if rated_movies_df.empty:
             return []

        genre_counter = Counter()
        for genres in rated_movies_df['genres']:
            if isinstance(genres, list):
                for genre in genres:
                    # Handle both {'id': 1, 'name': 'Action'} and 'Action' formats
                    if isinstance(genre, dict) and 'name' in genre:
                        genre_counter[genre['name']] += 1
                    elif isinstance(genre, str):
                         genre_counter[genre] += 1

        top_genres = [g for g, count in genre_counter.most_common(2)]
        if not top_genres:
            return []
        
        print(f"사용자 선호 장르: {top_genres}")

        # 3. Recommend popular movies from those genres
        fallback_recs = []
        all_movies_df = pd.DataFrame(movies_res.data)
        all_movies_df['id'] = all_movies_df['id'].astype(str)

        for genre_name in top_genres:
            # Filter movies that have the genre_name in their genres list
            def has_genre(genres):
                if not isinstance(genres, list):
                    return False
                for g in genres:
                    if isinstance(g, dict) and g.get('name') == genre_name:
                        return True
                    if isinstance(g, str) and g == genre_name:
                        return True
                return False

            movies_with_genre = all_movies_df[all_movies_df['genres'].apply(has_genre)]
            
            for movie_id in movies_with_genre['id']:
                if movie_id not in seen_movie_ids:
                    fallback_recs.append(movie_id)
        
        return list(dict.fromkeys(fallback_recs))[:top_n]

    except Exception as e:
        print(f"[오류] 대체 추천 로직 실행 중 오류 발생: {e}")
        return []