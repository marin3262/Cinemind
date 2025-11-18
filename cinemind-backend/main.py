# main.py
from dotenv import load_dotenv

# Load environment variables from .env file at the very beginning
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers from the routers directory
from routers import auth, movies, users, utils, user_interactions
from schemas import ResponseMessage
from recommendation_service import train_and_save_similarity_matrix

app = FastAPI(
    title="CineMind API",
    description="CineMind 모바일 앱을 위한 백엔드 API입니다.",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    """
    Actions to perform on application startup.
    - Train the recommendation model.
    """
    print("Server startup: Initializing background tasks...")
    # In a real-world scenario, you might run this in a background thread
    # or as a separate scheduled task to avoid blocking startup.
    train_and_save_similarity_matrix()
    print("Startup tasks complete.")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers from the 'routers' directory
app.include_router(auth.router)
app.include_router(movies.router)
app.include_router(users.router)
app.include_router(utils.router)
app.include_router(user_interactions.router) # 새로 추가된 라우터

# --- Root Endpoint ---
@app.get("/", response_model=ResponseMessage, tags=["Default"])
def read_root():
    """
    서버의 현재 상태를 확인하는 기본 엔드포인트입니다.
    """
    return {"message": "CineMind 백엔드 서버가 실행 중입니다!"}