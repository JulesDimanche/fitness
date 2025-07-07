from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey,DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import date,datetime
#from app.food_db import FoodBase

Base = declarative_base()
class UserData(BaseModel):
    weight: float
    height: float
    age: int
    gender: str
    activity: str
    goal: str
    target_weight: float
    target_duration: float

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    age = Column(Integer)
    gender = Column(String)
    height = Column(Float)
    weight = Column(Float)

    goals = relationship("Goal", back_populates="user")
    progress = relationship("Progress", back_populates="user")
    stats = relationship("UserStats", back_populates="user", uselist=False, cascade="all, delete")

class UserStats(Base):
    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    strength = Column(Integer, default=100)
    agility = Column(Integer, default=100)
    health = Column(Integer, default=100)
    endurance = Column(Integer, default=100)
    current_hp = Column(Integer, default=800)
    current_sp = Column(Integer, default=400)
    level = Column(Integer, default=1)
    title = Column(String, default="Novice")
    fatigue = Column(Integer, default=0)

    user = relationship("User", back_populates="stats")

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    target_weight = Column(Float)
    duration_weeks = Column(Integer)
    goal_type = Column(String)
    start_weight = Column(Float)

    user = relationship("User", back_populates="goals")


class Progress(Base):
    __tablename__ = "progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    week = Column(Integer)
    weight = Column(Float)
    actual_weight = Column(Float,nullable=True)
    date = Column(Date)
    calories = Column(Integer)
    protein = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)


    user = relationship("User", back_populates="progress")

class Exercise(Base):
    __tablename__ = 'exercises'

    id = Column(Integer, primary_key=True, index=True)
    exercise_name = Column(String, nullable=False)
    muscle_group = Column(String, nullable=False)
    equipment = Column(String, nullable=True)

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime, default=datetime.utcnow)

    exercises = relationship("WorkoutExercise", back_populates="session")


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id"))
    exercise_name = Column(String)

    sets = relationship("WorkoutSet", back_populates="exercise")
    session = relationship("WorkoutSession", back_populates="exercises")


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("workout_exercises.id"))
    set_number = Column(Integer)
    reps = Column(Integer)
    weight = Column(Float)

    exercise = relationship("WorkoutExercise", back_populates="sets")

class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)

    exercises = relationship("WorkoutTemplateExercise", back_populates="template", cascade="all, delete")


class WorkoutTemplateExercise(Base):
    __tablename__ = "workout_template_exercises"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workout_templates.id"))
    exercise_name = Column(String, nullable=False)

    sets = relationship("WorkoutTemplateSet", back_populates="exercise", cascade="all, delete")
    template = relationship("WorkoutTemplate", back_populates="exercises")


class WorkoutTemplateSet(Base):
    __tablename__ = "workout_template_sets"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("workout_template_exercises.id"))
    set_number = Column(Integer)
    reps = Column(Integer)
    weight = Column(Float)

    exercise = relationship("WorkoutTemplateExercise", back_populates="sets")


class UserConsumption(Base):
    __tablename__ = 'user_consumption'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))  # assuming you have a 'user' table
    food_name = Column(String, nullable=False)
    meal_time = Column(String, nullable=True)
    quantity = Column(Float, nullable=False, default=1.0)
    grams = Column(Float, nullable=True)
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)
    consumed_at = Column(DateTime, default=datetime.utcnow)

class FoodItem(Base):
    __tablename__ = 'food_items'

    id = Column(Integer, primary_key=True)
    food_item = Column(String, unique=True)
    serving_description = Column(String)
    serving_grams = Column(Float)   
    calories = Column(Float)
    protein = Column(Float)
    fat = Column(Float)
    carbs = Column(Float)