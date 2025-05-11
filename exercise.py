import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load CSV (no 'id' column needed)
df = pd.read_csv(r"D:\Download_temp\exercise.csv")

# SQLAlchemy setup
Base = declarative_base()

class Exercise(Base):
    __tablename__ = 'exercises'
    
    id = Column(Integer, primary_key=True)
    exercise_name = Column(String, index=True)
    muscle_group = Column(String, index=True)
    equipment = Column(String)

# Create SQLite database
engine = create_engine('sqlite:///exercises.db')  # Or your actual DB URL
Base.metadata.create_all(engine)

# Insert data
Session = sessionmaker(bind=engine)
session = Session()

for _, row in df.iterrows():
    ex = Exercise(
        exercise_name=row['Exercise_Name'],
        muscle_group=row['muscle_gp'],
        equipment=row['Equipment']
    )
    session.add(ex)

session.commit()
session.close()

print("Exercise data imported successfully into exercises table.")
