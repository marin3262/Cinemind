from fastapi import APIRouter, HTTPException
from typing import List, Optional
from collections import Counter

# 서비스, 스키마 임포트
from kobis_service import get_person_details, get_daily_box_office, get_movie_details, search_person_by_name
from schemas import PersonDetails, Person

router = APIRouter(
    prefix="/person", # prefix를 people에서 person으로 되돌림
    tags=["People"],
)

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from collections import Counter

# 서비스, 스키마 임포트
from kobis_service import get_person_details, get_daily_box_office, get_movie_details, search_person_by_name
from tmdb_service import search_person_on_tmdb, get_full_poster_url
from schemas import PersonDetails, Person, WeeklyPopularPerson, RelatedMovie

router = APIRouter(
    prefix="/person",
    tags=["People"],
)

@router.get("/weekly-popular", response_model=Optional[WeeklyPopularPerson])
def get_weekly_popular_person():
    """
    현재 박스오피스 상위 영화에 가장 많이 등장하는 배우 또는 감독을 찾아,
    사진, 관련 영화 정보와 함께 반환합니다.
    """
    try:
        box_office = get_daily_box_office()
        if not box_office:
            return None

        person_to_movies = {}

        for movie_summary in box_office[:5]:
            movie_cd = movie_summary.get('movieCd')
            movie_nm = movie_summary.get('movieNm')
            details = get_movie_details(movie_cd)
            if not details:
                continue

            people = details.get('directors', []) + details.get('actors', [])[:3]
            for person in people:
                person_name = person.get('peopleNm')
                if person_name not in person_to_movies:
                    person_to_movies[person_name] = {'movies': set(), 'kobis_id': None}
                
                person_to_movies[person_name]['movies'].add((movie_cd, movie_nm))
                if person.get('peopleCd'):
                    person_to_movies[person_name]['kobis_id'] = person.get('peopleCd')
        
        if not person_to_movies:
            return None

        # 가장 많은 영화에 등장한 사람 찾기
        top_person_name = max(person_to_movies, key=lambda p: len(person_to_movies[p]['movies']))
        top_person_data = person_to_movies[top_person_name]
        
        kobis_id = top_person_data.get('kobis_id')
        if not kobis_id:
            # KOBIS ID가 없는 경우, 이름으로 다시 한번 조회 시도
            kobis_id = search_person_by_name(top_person_name)
            if not kobis_id:
                return None

        # TMDB에서 인물 사진 검색
        profile_url = None
        tmdb_person = search_person_on_tmdb(top_person_name)
        if tmdb_person and tmdb_person.get('profile_path'):
            profile_url = get_full_poster_url(tmdb_person['profile_path'])

        related_movies = [RelatedMovie(id=movie_id, title=movie_title) for movie_id, movie_title in top_person_data['movies']]

        return WeeklyPopularPerson(
            id=kobis_id,
            name=top_person_name,
            profile_url=profile_url,
            related_movies=related_movies
        )

    except Exception as e:
        print(f"인기 영화인 분석 중 오류 발생: {e}")
        return None


@router.get("/{person_id}", response_model=PersonDetails)
def get_person_details_by_id(person_id: str):
    """
    KOBIS 영화인 코드를 사용하여 특정 인물의 상세 정보와 필모그래피를 가져옵니다.
    """
    details = get_person_details(person_cd=person_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"ID {person_id}에 해당하는 영화인을 찾을 수 없습니다.")
    
    return details
