from pydantic import BaseModel, EmailStr
from typing import List, Optional

# --- Pydantic Models ---
class User(BaseModel):
    username: str
    email: EmailStr

class UserCreate(User):
    password: str
    liked_movie_ids: List[int] | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class EmailCheckRequest(BaseModel):
    email: EmailStr

class UsernameCheckRequest(BaseModel):
    username: str

class Movie(BaseModel): 
    id: str
    rank: int
    title: str
    release: str
    audience: int # Cumulative audience
    daily_audience: int # Daily audience
    poster_url: str | None = None

class MovieDetails(BaseModel): 
    title: str
    release: str | None = None
    runtime: int | None = None
    genres: List[str]
    directors: List[str]
    actors: List[str]
    synopsis: str
    poster_url: str | None = None
    backdrop_url: str | None = None
    user_rating: int | None = None
    is_liked: bool | None = None
    comment: Optional[str] = None # Add optional comment field

class OnboardingMovie(BaseModel):
    movie_id: int
    title: str
    poster_url: str
    genre_name: str

class MovieIdList(BaseModel):
    ids: List[int]

class RatingCreate(BaseModel):
    movie_id: str
    rating: int
    comment: Optional[str] = None # Add optional comment field

class ResponseMessage(BaseModel):
    message: str

class UserActivityStatus(BaseModel):
    user_rating: int | None = None
    is_liked: bool
    comment: Optional[str] = None # Add optional comment field

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: User

class TrendingMovie(BaseModel):
    id: int
    title: str
    poster_url: str
    release_date: str | None = None
    overview: str | None = None
    vote_average: float | None = None

class Genre(BaseModel):
    id: int
    name: str

class UserRatingWithMovie(BaseModel):
    movie_id: str
    title: str
    poster_url: str | None = None
    rating: int
    comment: Optional[str] = None # Add optional comment field

class LikedMovie(BaseModel):
    movie_id: str
    title: str
    poster_url: str | None = None

class TasteAnalysisReport(BaseModel):
    taste_title: str
    top_genres: List[str]
    preferred_era: str | None = None
