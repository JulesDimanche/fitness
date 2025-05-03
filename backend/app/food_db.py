from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Source DB (food database)
food_engine = create_engine("sqlite:///food_data.db")
FoodSessionLocal = sessionmaker(bind=food_engine)