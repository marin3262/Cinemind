# kobis_service.py
import os
import requests
from datetime import datetime, timedelta

KOBIS_API_KEY = os.environ.get("KOBIS_API_KEY")
BOX_OFFICE_API_URL = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json"
MOVIE_INFO_API_URL = "http://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json"

def get_daily_box_office():
    """
    KOBIS API를 호출하여 일일 박스오피스 순위를 가져옵니다.
    (데이터는 보통 하루 전 기준으로 집계되므로, 어제 날짜를 조회합니다.)
    """
    # 어제 날짜를 'YYYYMMDD' 형식으로 계산
    yesterday = datetime.now() - timedelta(days=1)
    target_dt = yesterday.strftime('%Y%m%d')

    params = {
        'key': KOBIS_API_KEY,
        'targetDt': target_dt,
        'itemPerPage': '10' # 상위 10개 영화
    }

    try:
        response = requests.get(BOX_OFFICE_API_URL, params=params)
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
        print(f"KOBIS 상세 정보 API 호출 중 오류 발생: {e}")
        return None
    except Exception as e:
        print(f"KOBIS 상세 정보 처리 중 오류 발생: {e}")
        return None