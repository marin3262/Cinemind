# cinemind-backend/feature_service.py
from collections import Counter
from typing import Dict, Any, List

def extract_keywords_from_synopsis(synopsis: str, num_keywords: int = 10) -> List[str]:
    """
    줄거리에서 간단하게 키워드를 추출하는 임시 함수.
    실제 프로덕션에서는 형태소 분석기(e.g., KoNLPy)나 LLM을 사용해야 합니다.
    """
    if not synopsis:
        return []
    
    # 간단하게 명사로 추정되는 단어들만 필터링 (여기서는 길이가 2 이상인 단어)
    words = [word.strip(".,!?\"'()") for word in synopsis.split() if len(word.strip(".,!?\"'()")) > 1]
    
    # 불용어(stopwords) 제거 - 간단한 리스트
    stopwords = [
        "영화", "자신", "위해", "모든", "것을", "대한", "그의", "그녀의", "그리고", "하지만",
        "자신의", "그는", "그녀는", "에게", "에서", "이다", "위한", "있는", "없는", "같은",
        "시작한다", "된다", "만든다", "알게", "속에서", "점점", "서로를", "다시", "결심한다"
    ]
    words = [word for word in words if word not in stopwords]
    
    # 가장 빈번하게 등장하는 단어 추출
    most_common_words = [word for word, count in Counter(words).most_common(num_keywords)]
    
    return most_common_words

def extract_features_from_tmdb_details(tmdb_details: Dict[str, Any]) -> Dict[str, Any]:
    """
    get_movie_details_by_tmdb_id로부터 받은 상세 정보 딕셔너리에서
    우리가 필요로 하는 특징(키워드, 감독, 배우)을 추출합니다.
    """
    if not tmdb_details:
        return {}

    synopsis = tmdb_details.get("synopsis", "")
    keywords = extract_keywords_from_synopsis(synopsis)
    
    director = tmdb_details.get("directors", ["정보 없음"])[0]
    actors = tmdb_details.get("actors", [])

    return {
        "keywords": keywords,
        "director": director,
        "actors": actors
    }

