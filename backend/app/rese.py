# reset_db.py
from database import Base, engine

def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database reset complete")

if __name__ == "__main__":
    reset_database()