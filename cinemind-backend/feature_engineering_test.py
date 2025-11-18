# feature_engineering_test.py
import os
import asyncio
from dotenv import load_dotenv

# .env 파일에서 환경 변수를 로드하기 위해 main.py와 동일한 경로에 있다고 가정
# 실제 실행 경로에 따라 상대 경로 조정이 필요할 수 있습니다.
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

from tmdb_service import get_movie_details_by_tmdb_id
from llm_service import get_emotional_tags_for_movie
from collections import Counter

def extract_keywords_from_synopsis(synopsis: str, num_keywords: int = 5) -> list:
    """
    줄거리에서 간단하게 키워드를 추출하는 임시 함수.
    실제 프로덕션에서는 형태소 분석기(e.g., KoNLPy)나 LLM을 사용해야 합니다.
    """
    if not synopsis:
        return []
    
    # 간단하게 명사로 추정되는 단어들만 필터링 (여기서는 길이가 2 이상인 단어)
    words = [word.strip(".,!?") for word in synopsis.split() if len(word.strip(".,!?")) > 1]
    
    # 불용어(stopwords) 제거 - 간단한 리스트
    stopwords = ["영화", "자신", "위해", "모든", "것을", "대한", "그의", "그녀의", "그리고", "하지만"]
    words = [word for word in words if word not in stopwords]
    
    # 가장 빈번하게 등장하는 단어 추출
    most_common_words = [word for word, count in Counter(words).most_common(num_keywords)]
    
    return most_common_words

async def main():
    """
    특정 영화의 특징을 추출하여 출력하는 메인 함수
    """
    # 테스트할 영화: 범죄도시4 (TMDB ID: 940721)
    test_movie_id = 940721

    print(f"--- 영화 ID {test_movie_id}의 특징 추출 시작 ---")

    # 1. TMDB에서 영화 상세 정보 가져오기
    movie_details = await get_movie_details_by_tmdb_id(test_movie_id)

    if not movie_details:
        print(f"영화를 찾을 수 없습니다.")
        return

    # 2. 각 특징 추출
    title = movie_details.get("title")
    genres = movie_details.get("genres", [])
    synopsis = movie_details.get("synopsis", "")
    director = movie_details.get("directors", ["정보 없음"])[0]
    actors = movie_details.get("actors", [])
    
    # 3. 감성 태그 및 키워드 추출
    emotional_tags = get_emotional_tags_for_movie(title)
    keywords = extract_keywords_from_synopsis(synopsis)

    # 4. 최종 결과 구성
    feature_set = {
        "movie_id": test_movie_id,
        "title": title,
        "features": {
            "genres": genres,
            "keywords": keywords,
            "director": director,
            "actors": actors,
            "emotional_tags": emotional_tags,
        }
    }

    # 5. 결과 출력
    import json
    print("\n--- 추출된 특징 ---")
    print(json.dumps(feature_set, indent=2, ensure_ascii=False))
    print("\n--- 작업 완료 ---")


if __name__ == "__main__":
    # Python 3.7+ 에서는 asyncio.run()을 바로 사용할 수 있습니다.
    asyncio.run(main())
