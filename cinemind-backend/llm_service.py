from typing import List
import random

# 미리 정의된 감성 태그 풀
EMOTIONAL_TAGS = {
    "happy": ["#기분_UP", "#신나는", "#활기찬", "#긍정적인"],
    "sad": ["#눈물", "#감성적인", "#위로가_필요해", "#쓸쓸한"],
    "angry": ["#스트레스_해소", "#통쾌한", "#복수"],
    "relax": ["#힐링", "#차분한", "#잔잔한", "#생각이_많을때"],
    "love": ["#로맨틱", "#설레는", "#사랑스러운"],
    "thrill": ["#스릴넘치는", "#손에_땀을_쥐는", "#긴장감"],
}

# 키워드와 감성 매핑
KEYWORD_TO_EMOTION = {
    "사랑": "love", "로맨스": "love", "연인": "love",
    "전쟁": "angry", "복수": "angry", "범죄": "angry", "액션": "angry",
    "슬픔": "sad", "이별": "sad", "눈물": "sad", "죽음": "sad",
    "코미디": "happy", "웃음": "happy", "축제": "happy",
    "스릴러": "thrill", "공포": "thrill", "미스터리": "thrill",
    "드라마": "relax", "가족": "relax", "자연": "relax",
}

def get_emotional_tags_for_movie(title: str) -> List[str]:
    """
    영화 제목을 기반으로 감성 태그를 생성하는 함수 (LLM 시뮬레이션)
    """
    detected_emotions = set()
    
    # 1. 제목의 키워드를 통해 감성 감지
    for keyword, emotion in KEYWORD_TO_EMOTION.items():
        if keyword in title:
            detected_emotions.add(emotion)
            
    # 2. 감지된 감성이 없으면, '드라마'와 '스릴' 중에서 랜덤 선택
    if not detected_emotions:
        fallback_emotion = random.choice(["relax", "thrill"])
        detected_emotions.add(fallback_emotion)
        
    # 3. 감지된 감성에 해당하는 태그 풀에서 1~2개의 태그를 랜덤으로 선택
    final_tags = set()
    for emotion in detected_emotions:
        tags_to_add = random.sample(EMOTIONAL_TAGS[emotion], k=random.randint(1, 2))
        final_tags.update(tags_to_add)
        
    return list(final_tags)

# 테스트
if __name__ == "__main__":
    test_titles = ["이터널 선샤인", "사랑의 불시착", "범죄도시4", "서울의 봄", "웡카"]
    for t in test_titles:
        tags = get_emotional_tags_for_movie(t)
        print(f"'{t}' -> {tags}")
