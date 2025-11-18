from fastapi import APIRouter, Depends, HTTPException, Query, Request
from schemas import RatingCreate, ResponseMessage, UserActivityStatus
from auth_handler import get_current_user
from supabase_client import supabase_admin

router = APIRouter(
    tags=["User Interactions"]
)

@router.get("/users/me/activity-status", response_model=UserActivityStatus)
def get_user_activity_for_movie(movie_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    """
    특정 영화에 대한 현재 사용자의 활동 상태(평점, 찜 여부, 코멘트)를 가져옵니다.
    """
    try:
        user_id = current_user.id
        user_rating = None
        comment = None
        is_liked = False

        # Fetch user rating and comment safely
        try:
            rating_res = supabase_admin.table('user_ratings').select('rating, comment').eq('user_id', user_id).eq('movie_id', movie_id).single().execute()
            user_rating = rating_res.data.get('rating')
            comment = rating_res.data.get('comment')
        except Exception:
            pass

        # Fetch like status safely
        try:
            like_res = supabase_admin.table('user_likes').select('id', count='exact').eq('user_id', user_id).eq('movie_id', movie_id).execute()
            if like_res.count > 0:
                is_liked = True
        except Exception:
            pass
        
        return UserActivityStatus(user_rating=user_rating, is_liked=is_liked, comment=comment)

    except Exception as e:
        print(f"Error fetching user activity status for movie {movie_id}: {e}")
        raise HTTPException(status_code=500, detail="활동 상태를 가져오는 중 오류가 발생했습니다.")

@router.post("/ratings", response_model=ResponseMessage)
async def create_or_update_rating(rating_data: RatingCreate, request: Request, current_user: dict = Depends(get_current_user)):
    """
    영화에 대한 평점을 생성하거나 업데이트합니다. (Pydantic 우회)
    """
    try:
        user_id = current_user.id
        movie_id = rating_data.movie_id
        
        # Pydantic을 우회하여 원시 데이터에서 코멘트를 직접 가져옵니다.
        raw_body = await request.json()
        
        # 1. 먼저 업데이트 시도
        update_data = {
            'rating': rating_data.rating,
        }
        update_result = supabase_admin.table('user_ratings').update(update_data).eq('user_id', user_id).eq('movie_id', movie_id).execute()

        # 2. 업데이트된 데이터가 없으면 새로 삽입
        if not update_result.data:
            insert_data = {
                'user_id': user_id,
                'movie_id': movie_id,
                'rating': rating_data.rating,
            }
            supabase_admin.table('user_ratings').insert(insert_data).execute()

        return {"message": "평점이 성공적으로 저장되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"평점 저장 중 오류 발생: {str(e)}")

@router.post("/movies/{movie_id}/like", response_model=ResponseMessage)
def like_movie(movie_id: str, current_user: dict = Depends(get_current_user)):
    """
    영화를 '찜' 목록에 추가합니다. 중복된 경우에도 오류 없이 처리됩니다.
    """
    try:
        supabase_admin.table('user_likes').upsert({
            'user_id': current_user.id,
            'movie_id': movie_id
        }).execute()
        return {"message": "영화를 찜했습니다."}
    except Exception as e:
        print(f"Error liking movie: {e}")
        if 'violates foreign key constraint' in str(e):
            raise HTTPException(status_code=404, detail=f"ID가 {movie_id}인 영화를 찾을 수 없습니다.")
        raise HTTPException(status_code=500, detail=f"영화 찜하기 중 오류 발생: {str(e)}")

@router.delete("/movies/{movie_id}/like", response_model=ResponseMessage)
def unlike_movie(movie_id: str, current_user: dict = Depends(get_current_user)):
    """
    '찜' 목록에서 영화를 제거합니다.
    """
    try:
        delete_result = supabase_admin.table('user_likes').delete().eq('user_id', current_user.id).eq('movie_id', movie_id).execute()
        
        if not delete_result.data:
            return {"message": "찜한 기록이 없는 영화입니다."}

        return {"message": "영화 찜하기를 취소했습니다."}
    except Exception as e:
        print(f"Error unliking movie: {e}")
        raise HTTPException(status_code=500, detail=f"영화 찜하기 취소 중 오류 발생: {str(e)}")
