from sqlalchemy import create_engine,MetaData,Table
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./gymbuddy.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def init_db():
    from app import models  # import all models before creating tables
    Base.metadata.create_all(bind=engine)
