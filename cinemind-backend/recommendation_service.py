# recommendation_service.py
from supabase_client import supabase
from kobis_service import get_daily_box_office, get_movie_details
from collections import Counter

def get_recommendations_for_user(user_id: str):
    """
    사용자의 평점 데이터를 기반으로 영화를 추천합니다.
    1. 사용자의 모든 평점을 가져옵니다.
    2. 가장 선호하는 장르를 찾습니다.
    3. 현재 박스오피스 목록에서 해당 장르의 영화를 추천합니다.
    """
    try:
        # 1. 사용자의 모든 평점 가져오기
        ratings_response = supabase.table('user_ratings').select('movie_id, rating').eq('user_id', user_id).execute()
        user_ratings = ratings_response.data
        if not user_ratings:
            return {"message": "평점 데이터가 부족하여 추천할 수 없습니다."}

        # 2. 가장 선호하는 장르 찾기
        # 높은 평점(4점 이상)을 준 영화들의 장르를 수집
        preferred_genres = []
        for rating_info in user_ratings:
            if rating_info['rating'] >= 4:
                movie_details = get_movie_details(rating_info['movie_id'])
                if movie_details and 'genres' in movie_details:
                    for genre in movie_details['genres']:
                        preferred_genres.append(genre['genreNm'])
        
        if not preferred_genres:
            return {"message": "선호하는 장르를 찾을 수 없습니다."}

        # 가장 많이 나타난 장르를 선호 장르로 선택
        top_genre = Counter(preferred_genres).most_common(1)[0][0]

        # 3. 현재 박스오피스에서 영화 추천
        box_office_movies = get_daily_box_office()
        if not box_office_movies:
            return {"message": "현재 박스오피스 정보를 가져올 수 없습니다."}

        recommendations = []
        for movie in box_office_movies:
            # 박스오피스 영화의 상세 정보를 가져와 장르 비교
            details = get_movie_details(movie['movieCd'])
            if details and 'genres' in details:
                movie_genres = [g['genreNm'] for g in details['genres']]
                if top_genre in movie_genres:
                    # 사용자가 아직 평가하지 않은 영화만 추천
                    is_rated = any(r['movie_id'] == movie['movieCd'] for r in user_ratings)
                    if not is_rated:
                        recommendations.append(movie)
        
        return recommendations

    except Exception as e:
        print(f"추천 생성 중 오류 발생: {e}")
        return None
