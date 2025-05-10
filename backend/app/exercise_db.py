from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_EXERCISE_DB_URL = "sqlite:///./exercises.db"

exercise_engine = create_engine(SQLALCHEMY_EXERCISE_DB_URL)
ExerciseSessionLocal = sessionmaker(bind=exercise_engine)

