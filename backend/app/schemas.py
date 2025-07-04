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

class UserStatsResponse(BaseModel):
    strength: int
    agility: int
    health: int
    endurance: int

    class Config:
        orm_mode = True
        
class ProgressCreate(BaseModel):
    week: int
    weight: float
    protein: float | None = None 
    fat: float | None = None 
    
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

class UpdateWorkoutSet(BaseModel):
    exercise_name: str
    set_number: int
    new_reps: int
    new_weight: float
    date: str 

class TemplateSet(BaseModel):
    set_number: int
    reps: int
    weight: float

class TemplateExercise(BaseModel):
    exercise_name: str
    sets: List[TemplateSet]

class WorkoutTemplateCreate(BaseModel):
    name: str
    exercises: List[TemplateExercise]

class TemplateSetOut(BaseModel):
    set_number: int
    reps: int
    weight: float

    class Config:
        orm_mode = True


class TemplateExerciseOut(BaseModel):
    exercise_name: str
    sets: List[TemplateSetOut]

    class Config:
        orm_mode = True


class WorkoutTemplateOut(BaseModel):
    id: int
    name: str
    exercises: List[TemplateExerciseOut]

    class Config:
        orm_mode = True

    

class LogFoodRequest(BaseModel):
    food_name: str
    quantity: float
    consumed_at: Optional[datetime] = None
    meal_time: str
    
class FoodSuggestion(BaseModel):
    food_item: str
    serving_description: str
    serving_grams: float

    model_config = {"from_attributes": True}


class FoodLogUpdate(BaseModel):
    food_name: Optional[str]=None
    quantity: Optional[float]=None
    grams: Optional[float]=None

class ExerciseSuggestion(BaseModel):
    id: int
    exercise_name: str
    muscle_group: str
    equipment:Optional[str] = None 
    class Config:
        orm_mode = True

    