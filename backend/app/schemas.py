from pydantic import BaseModel
from typing import List,Optional
from datetime import datetime
from datetime import date

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str
class ProgressCreate(BaseModel):
    week: int
    weight: float
    
class WorkoutSetCreate(BaseModel):
    set_number: int
    reps: int
    weight: float

class WorkoutExerciseCreate(BaseModel):
    exercise_name: str
    sets: List[WorkoutSetCreate]

class WorkoutSessionCreate(BaseModel):
    date: Optional[datetime] = None  # optional, if not given use now
    exercises: List[WorkoutExerciseCreate]

class LogFoodRequest(BaseModel):
    food_name: str
    quantity: float
    consumed_at: Optional[datetime] = None
    meal_time: str
    
class FoodSuggestion(BaseModel):
    food_item: str
    serving_description: str
    serving_grams: float

    class Config:
        orm_mode = True

class FoodLogUpdate(BaseModel):
    food_name: Optional[str]
    quantity: Optional[float]
    grams: Optional[float]
    