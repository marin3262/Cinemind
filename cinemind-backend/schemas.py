from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

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
    audience: int
    daily_audience: int
    rank_change: Optional[str] = None
    poster_url: str | None = None
    recommendation_reason: Optional[str] = None

class WatchProvider(BaseModel):
    provider_name: str
    logo_url: str

class MovieDetails(BaseModel): 
    id: str
    title: str
    release_date: str | None = None
    runtime: int | None = None
    genres: List[str]
    directors: List[str]
    actors: List[str]
    synopsis: str
    poster_url: str | None = None
    backdrop_url: str | None = None
    user_rating: int | None = None
    is_liked: bool | None = None
    comment: Optional[str] = None
    watch_providers: List[WatchProvider] | None = None
    watch_link: str | None = None

class OnboardingMovie(BaseModel):
    movie_id: int
    title: str
    poster_url: str
    genre_name: str
    actors: List[str] = []

class MovieIdList(BaseModel):
    ids: List[int]

class RatingCreate(BaseModel):
    movie_id: str
    rating: int
    comment: Optional[str] = None
    source: str | None = None

class ResponseMessage(BaseModel):
    message: str

class UserActivityStatus(BaseModel):
    user_rating: int | None = None
    is_liked: bool
    comment: Optional[str] = None

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
    recommendation_reason: Optional[str] = None

class Genre(BaseModel):
    id: int
    name: str

class UserRatingWithMovie(BaseModel):
    movie_id: str
    title: str
    poster_url: str | None = None
    rating: int
    comment: Optional[str] = None

class LikedMovie(BaseModel):
    movie_id: str
    title: str
    poster_url: str | None = None
    created_at: datetime

class Person(BaseModel):
    id: str
    name: str

class RatingDistributionItem(BaseModel):
    rating: int
    count: int

class TasteAnalysisResponse(BaseModel):
    total_ratings: int
    analysis_title: str
    top_genres: List[str]
    rating_distribution: List[RatingDistributionItem]
    top_actors: List[Person]
    top_directors: List[Person]

class BoxOfficeBattleResponse(BaseModel):
    champion: Optional[Movie] = None
    challenger: Optional[Movie] = None

# --- Person Details ---
class FilmoItem(BaseModel):
    movieCd: str
    movieNm: str
    category: str | None = None

class PersonDetails(BaseModel):
    personCd: str
    personNm: str
    repRoleNm: Optional[str]
    filmos: List[FilmoItem]

class RelatedMovie(BaseModel):
    id: str
    title: str

class WeeklyPopularPerson(BaseModel):
    id: str
    name: str
    profile_url: Optional[str] = None
    related_movies: List[RelatedMovie]