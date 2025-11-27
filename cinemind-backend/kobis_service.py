# kobis_service.py
import os
import requests
from datetime import datetime, timedelta

KOBIS_API_KEY = os.environ.get("KOBIS_API_KEY")
BOX_OFFICE_API_URL = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json"
MOVIE_INFO_API_URL = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json"

def get_daily_box_office(repNationCd: str | None = None):
    """
    KOBIS API를 호출하여 일일 박스오피스 순위를 가져옵니다.
    (데이터는 보통 하루 전 기준으로 집계되므로, 어제 날짜를 조회합니다.)
    repNationCd: 'K' (한국영화), 'F' (외국영화)
    """
    # 어제 날짜를 'YYYYMMDD' 형식으로 계산
    yesterday = datetime.now() - timedelta(days=1)
    target_dt = yesterday.strftime('%Y%m%d')

    params = {
        'key': KOBIS_API_KEY,
        'targetDt': target_dt,
        'itemPerPage': '10' # 상위 10개 영화
    }

    if repNationCd:
        params['repNationCd'] = repNationCd
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    try:
        response = requests.get(BOX_OFFICE_API_URL, params=params, headers=headers)
        response.raise_for_status() # 오류가 발생하면 예외를 발생시킴
        data = response.json()
        return data.get('boxOfficeResult', {}).get('dailyBoxOfficeList', [])
    except requests.exceptions.RequestException as e:
        print(f"KOBIS API 호출 중 오류 발생: {e}")
        return None
    except Exception as e:
        print(f"KOBIS 데이터 처리 중 오류 발생: {e}")
        return None

def get_movie_details(movie_cd: str):
    """
    KOBIS API를 호출하여 특정 영화의 상세 정보를 가져옵니다.
    """
    if not movie_cd:
        return None
        
    params = {
        'key': KOBIS_API_KEY,
        'movieCd': movie_cd
    }
    try:
        response = requests.get(MOVIE_INFO_API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get('movieInfoResult', {}).get('movieInfo', None)
    except requests.exceptions.RequestException as e:
        print(f"KOBIS 영화 상세 정보 조회 중 오류 발생: {e}")
        return None

def search_person_by_name(person_nm: str):
    """
    KOBIS에서 영화인명으로 영화인을 검색하여 대표적인 한 명의 코드를 반환합니다.
    """
    if not KOBIS_API_KEY:
        print("KOBIS_API_KEY가 설정되지 않았습니다.")
        return None

    api_url = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/people/searchPeopleList.json"
    params = {
        "key": KOBIS_API_KEY,
        "peopleNm": person_nm,
    }
    
    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        
        people_list_result = response.json().get("peopleListResult", {})
        people_list = people_list_result.get("peopleList", [])

        if people_list:
            # Return the first person found
            return people_list[0].get("peopleCd")
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"KOBIS 영화인 목록 조회 중 오류 발생: {e}")
        return None

def get_person_details(person_cd: str):
    """
    KOBIS 영화인코드(personCd)를 사용하여 영화인의 상세 정보를 조회합니다.
    """
    if not KOBIS_API_KEY:
        print("KOBIS_API_KEY가 설정되지 않았습니다.")
        return None

    api_url = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/people/searchPeopleInfo.json"
    params = {
        "key": KOBIS_API_KEY,
        "peopleCd": person_cd,
    }

    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        
        # 실제 데이터는 중첩된 구조 안에 있음
        person_info_result = response.json().get('peopleInfoResult', {})
        person_info = person_info_result.get('peopleInfo')

        if not person_info:
            return None

        # 필모그래피를 'category' 기준으로 그룹화
        filmos = []
        for filmo in person_info.get('filmos', []):
            filmos.append({
                "movieCd": filmo.get('movieCd'),
                "movieNm": filmo.get('movieNm'),
                "category": filmo.get('category'),
            })

        return {
            "personCd": person_info.get("peopleCd"),
            "personNm": person_info.get("peopleNm"),
            "repRoleNm": person_info.get("repRoleNm"),
            "filmos": filmos,
        }

    except requests.exceptions.RequestException as e:
        print(f"KOBIS 영화인 상세 정보 조회 중 오류 발생: {e}")
        return None
    except Exception as e:
        print(f"KOBIS 상세 정보 처리 중 오류 발생: {e}")
        return None