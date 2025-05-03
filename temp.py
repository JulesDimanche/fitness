import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load your CSV file
df = pd.read_csv(r"D:\Download_temp\food_dataset_fin.csv")  # <-- change to your file name

# SQLAlchemy setup
Base = declarative_base()

class FoodItem(Base):
    __tablename__ = 'food_items'
    
    id = Column(Integer, primary_key=True)
    food_item = Column(String, index=True)
    category = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    serving_description = Column(String, nullable=False)
    serving_grams = Column(Float, nullable=False)
    calories = Column(Float, nullable=False)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)

# Create SQLite database (or change to PostgreSQL URL)
engine = create_engine('sqlite:///food_data.db')  # creates food_data.db
Base.metadata.create_all(engine)

# Insert data
Session = sessionmaker(bind=engine)
session = Session()

for _, row in df.iterrows():
    item = FoodItem(
        food_item=row['Food Item'],  # Must match model
        category=row['Category'],
        quantity=float(row['Quantity']),
        serving_description=row['Serving Description'],
        serving_grams=float(row['Serving (g/ml)']),
        calories=float(row['Calories']),
        protein=float(row['Protein (g)']),
        carbs=float(row['Carbs (g)']),
        fat=float(row['Fat (g)'])
    )
    session.add(item)

session.commit()
session.close()

print("Data imported successfully into food_items table.")
