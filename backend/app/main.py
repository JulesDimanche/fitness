from sqlalchemy import text
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from app.models import UserData
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, auth
from app.database import SessionLocal, engine
from app.models import User
from fastapi import Body
from datetime import date
from app.database import init_db
from fastapi.security import OAuth2PasswordBearer
from app.auth import get_current_user
from app.models import Goal, Progress
from datetime import datetime, timedelta
from app.auth import create_access_token
from app.auth import hash_password
from app.models import WorkoutSession, WorkoutExercise, WorkoutSet
from app.food_db import FoodSessionLocal
from app.schemas import FoodSuggestion
from fastapi import Query
from sqlalchemy import cast, Date


models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change this to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_food_db():
    db = FoodSessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pw = auth.hash_password(user.password)
    db_user = User(username=user.username,email=user.email, hashed_password=hashed_pw)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User registered successfully"}

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    print("Login attempt for:", user.username)

    db_user = db.query(User).filter(User.username == user.username).first()
    print("DB user found:", db_user is not None)

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    print("Comparing passwords...")
    match = auth.verify_password(user.password, db_user.hashed_password)
    print("Password match:", match)

    if not match:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token = auth.create_access_token(data={"sub": db_user.username})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": db_user.username
    }




# Allow frontend (browser) requests
init_db()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

@app.post("/analyze")
def analyze_user(data: UserData, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    height_m = data.height / 100
    bmi = round(data.weight / (height_m ** 2), 2)

    # BMI category
    if bmi < 18.5:
        status = "Underweight"
    elif 18.5 <= bmi < 25:
        status = "Normal"
    elif 25 <= bmi < 30:
        status = "Overweight"
    else:
        status = "Obese"

    # BMR Calculation
    if data.gender == "male":
        bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5
    else:
        bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161

    # Activity factor
    activity_map = {"low": 1.2, "medium": 1.55, "high": 1.9}
    tdee = round(bmr * activity_map.get(data.activity, 1.2))

    # Goal calorie adjustment
    weight_diff = data.target_weight - data.weight
    target_duration_weekly=int(data.target_duration*4)
    kg_per_week = weight_diff / (target_duration_weekly)
    calorie_change_per_week = kg_per_week * 7700  # 7700 kcal = 1kg fat
    required_calories = round(tdee + calorie_change_per_week / 7)  # daily adjustment
    goal = Goal(
        user_id=current_user.id,
        target_weight=data.target_weight,
        duration_weeks=target_duration_weekly,
        goal_type=data.goal,
        start_weight=data.weight 
    )
    db.add(goal)
    db.flush() 

    weekly_progress=[]
    for week in range(1,target_duration_weekly +1):
        progress_weight=round(data.weight+kg_per_week*week,1)
        temp_bmr = 10 * progress_weight + 6.25 * data.height - 5 * data.age + (5 if data.gender == "male" else -161)
        temp_tdee = round(temp_bmr * activity_map.get(data.activity, 1.2))
        temp_required = round(temp_tdee + calorie_change_per_week / 7)
        progress = Progress(
            user_id=current_user.id,
            week=week,
            weight=progress_weight,
            date=datetime.now() + timedelta(weeks=week)
        )
        db.add(progress)
        weekly_progress.append({"week":week,"weight":progress_weight,"required_calories":temp_required})
    db.commit()

    # Suggestion text
    if weight_diff > 0:
        suggestion = f"Aim to gain {kg_per_week:.2f} kg/week. Increase calories gradually."
    elif weight_diff < 0:
        suggestion = f"Aim to lose {abs(kg_per_week):.2f} kg/week. Reduce calories moderately."
    else:
        suggestion = "You are already at your target weight."

    '''print("Returning response:", {
        "bmi": bmi,
        "status": status,
        "Maintanence_calories": tdee,
        "required_calories": required_calories,
        "weekly_change": round(kg_per_week, 2),
        "suggestion": suggestion})'''
    return {
        "bmi": bmi,
        "status": status,
        "Maintanence_calories": tdee,
        "required_calories": required_calories,
        "weekly_change": round(kg_per_week, 2),
        "weekly_progress": weekly_progress,
        "suggestion": suggestion
    }
@app.post("/progress")
def save_progress(data: schemas.ProgressCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    progress = models.Progress(
        user_id=current_user.id,
        week=data.week,
        weight=data.weight,
        date=datetime.date.today()
    )
    db.add(progress)
    db.commit()
    return {"message": "Progress saved successfully"}
@app.get("/progress-feedback")
def get_progress_feedback(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    latest_goal = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).order_by(models.Goal.id.desc()).first()
    if not latest_goal:
        raise HTTPException(status_code=404, detail="No goal set")

    progress_entries = db.query(models.Progress).filter(models.Progress.user_id == current_user.id).order_by(models.Progress.week).all()

    feedback = []
    start_weight = current_user.weight
    total_weeks = latest_goal.duration_weeks
    kg_per_week = (latest_goal.target_weight - start_weight) / total_weeks

    for entry in progress_entries:
        expected_weight = round(start_weight + kg_per_week * entry.week, 1)
        weight_diff = entry.actual_weight - expected_weight
        calorie_change = round((weight_diff * 7700) / 7)
        suggestion = "Maintain" if abs(calorie_change) < 50 else ("Increase" if calorie_change > 0 else "Decrease")
        feedback.append({
            "week": entry.week,
            "actual_weight": entry.weight,
            "expected_weight": expected_weight,
            "calorie_adjustment": calorie_change,
            "suggestion": f"{suggestion} calories by {abs(calorie_change)} kcal/day"
        })

    return feedback

@app.post("/submit-progress")
def submit_progress(
    week: int = Body(...),
    actual_weight: float = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    latest_goal = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).order_by(models.Goal.id.desc()).first()
    if not latest_goal:
        raise HTTPException(status_code=404, detail="No goal set")

    start_weight = latest_goal.start_weight
    if start_weight is None:
        raise HTTPException(status_code=400, detail="Starting weight not found.")

    kg_per_week = (latest_goal.target_weight - start_weight) / latest_goal.duration_weeks
    expected_weight = round(start_weight + kg_per_week * week, 1)

    weight_diff = actual_weight - expected_weight
    calorie_adjustment = round((weight_diff * 7700) / 7)
    suggestion = "Maintain" if abs(calorie_adjustment) < 50 else ("Increase" if calorie_adjustment < 0 else "Decrease")

    progress_entry = db.query(models.Progress).filter(
        models.Progress.user_id == current_user.id,
        models.Progress.week == week
    ).first()

    if progress_entry:
        progress_entry.actual_weight = actual_weight
        progress_entry.date = date.today()
    else:
        progress_entry = models.Progress(
            user_id=current_user.id,
            week=week,
            weight=None,  # predicted weight is not updated here
            actual_weight=actual_weight,
            date=date.today()
        )
        db.add(progress_entry)

    db.commit()

    return {
        "week": week,
        "actual_weight": actual_weight,
        "expected_weight": expected_weight,
        "calorie_adjustment": calorie_adjustment,
        "suggestion": f"{suggestion} calories by {abs(calorie_adjustment)} kcal/day"
    }
@app.post("/workout_sessions")
async def create_workout_session(
    session_data: schemas.WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session_date = session_data.date or datetime.utcnow()

    # Create the new workout session
    new_session = WorkoutSession(
        user_id=current_user.id,
        date=session_date
    )

    # Loop over the exercises in the session data
    for exercise_data in session_data.exercises:
        # Log the exercise data to check if it's correct
        print("Exercise Data:", exercise_data)

        # Create a new exercise for each exercise
        new_exercise = WorkoutExercise(
            session_id=new_session.id,  # Link the exercise to the current session
            exercise_name=exercise_data.exercise_name
        )

        # Log the sets to ensure that set data is present
        print("Sets Data:", exercise_data.sets)

        # Loop over the sets for each exercise and create new sets
        for set_data in exercise_data.sets:
            print("Creating Set:", set_data)  # Log each set data
            new_set = WorkoutSet(
                exercise_id=new_exercise.id,  # Link the set to the current exercise
                set_number=set_data.set_number,
                reps=set_data.reps,
                weight=set_data.weight
            )
            # Append the set to the exercise's sets relationship
            new_exercise.sets.append(new_set)

        # Add the new exercise to the workout session's exercises relationship
        new_session.exercises.append(new_exercise)

    # Log the sets to be added to the exercise
    print("Sets to be added:", new_exercise.sets)

    # Add the session to the database
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {"message": "Workout session created successfully", "session_id": new_session.id}

@app.post("/previous_exercise/{exercise_name}")
async def get_previous_exercise(
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    previous_exercise = (
        db.query(WorkoutExercise)
        .join(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .filter(WorkoutExercise.exercise_name == exercise_name)
        .order_by(WorkoutSession.date.desc())
        .first()
    )

    if not previous_exercise:
        return {"message": "No previous record"}

    previous_sets = [
        {
            "set_number": s.set_number,
            "reps": s.reps,
            "weight": s.weight
        }
        for s in previous_exercise.sets
    ]

    return {
        "exercise_name": previous_exercise.exercise_name,
        "date": previous_exercise.session.date,
        "sets": previous_sets
    }
@app.post("/workout_volume")
async def get_workout_volume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.date)
        .all()
    )

    volume_per_session = []

    for session in sessions:
        total_volume = 0
        for exercise in session.exercises:
            for set in exercise.sets:
                total_volume += set.reps * set.weight

        volume_per_session.append({
            "date": session.date,
            "total_volume": total_volume
        })

    return volume_per_session
@app.get("/personal_records")
async def get_personal_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exercises = db.query(WorkoutExercise.exercise_name).distinct().all()
    records = {}

    for (exercise_name,) in exercises:
        best_set = (
            db.query(WorkoutSet)
            .join(WorkoutExercise)
            .join(WorkoutSession)
            .filter(WorkoutSession.user_id == current_user.id)
            .filter(WorkoutExercise.exercise_name == exercise_name)
            .order_by(WorkoutSet.weight.desc())
            .first()
        )
        if best_set:
            records[exercise_name] = {
                "max_weight": best_set.weight,
                "reps": best_set.reps
            }

    return records

@app.get("/previous_exercise/{exercise_name}")
async def get_previous_exercise(
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    previous_exercise = (
        db.query(WorkoutExercise)
        .join(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .filter(WorkoutExercise.exercise_name == exercise_name)
        .order_by(WorkoutSession.date.desc())
        .first()
    )
    if not previous_exercise:
        return {"message": "No previous record"}

    previous_sets = [
        {
            "set_number": s.set_number,
            "reps": s.reps,
            "weight": s.weight
        }
        for s in previous_exercise.sets
    ]

    return {
        "exercise_name": previous_exercise.exercise_name,
        "date": previous_exercise.session.date,
        "sets": previous_sets
    }

from app.schemas import LogFoodRequest
from app.models import UserConsumption, FoodItem, Base
from app.food_db import FoodSessionLocal

food_session_local = FoodSessionLocal

@app.post("/log-food")
def log_food(request: LogFoodRequest, current_user: User = Depends(get_current_user)):
    food_session: Session = food_session_local()
    gym_session: Session = SessionLocal()

    try:
        # 1. Get food info from food_data.db
        food = food_session.query(FoodItem).filter(FoodItem.food_item == request.food_name).first()
        if not food:
            raise HTTPException(status_code=404, detail="Food not found")

        # 2. Multiply nutrients by quantity
        grams = request.quantity * food.serving_grams
        calories = round(food.calories * request.quantity, 2)
        protein = round(food.protein * request.quantity, 2)
        fat = round(food.fat * request.quantity, 2)
        carbs = round(food.carbs * request.quantity, 2)

        consumed_at = request.consumed_at or date.today()

        # 3. Insert into gymbuddy.db
        new_entry = UserConsumption(
            user_id=current_user.id,
            food_name=food.food_item,
            quantity=request.quantity,
            grams=grams,
            calories=calories,
            protein=protein,
            fat=fat,
            carbs=carbs,
            consumed_at=consumed_at
        )
        gym_session.add(new_entry)
        gym_session.commit()

        # Return the new entry data so frontend can immediately display it
        return {
            "message": "Food logged successfully",
            "food_log": {
                "food_name": new_entry.food_name,
                "quantity": new_entry.quantity,
                "grams": new_entry.grams,
                "calories": new_entry.calories,
                "protein": new_entry.protein,
                "fat": new_entry.fat,
                "carbs": new_entry.carbs,
                "consumed_at": new_entry.consumed_at.isoformat()
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        gym_session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        food_session.close()
        gym_session.close()


@app.get("/food-suggestions", response_model=List[FoodSuggestion])
def get_food_suggestions(query: str, db: Session = Depends(get_food_db)):
    if len(query) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters long")
    
    foods = db.query(FoodItem).filter(FoodItem.food_item.ilike(f"%{query}%")).limit(10).all()
    
    if not foods:
        raise HTTPException(status_code=404, detail="No food items found")
    
    return foods

@app.get("/food-log")
def get_food_log(
    log_date: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        day_start = datetime.strptime(log_date, "%Y-%m-%d")
        day_end = day_start + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    logs = db.query(UserConsumption).filter(
        UserConsumption.user_id == current_user.id,
        UserConsumption.consumed_at >= day_start,
        UserConsumption.consumed_at < day_end
    ).all()

    return[
        {
            "food_name": log.food_name,
            "quantity": log.quantity,
            "grams": log.grams,
            "calories": log.calories,
            "protein": log.protein,
            "fat": log.fat,
            "carbs": log.carbs,
            "consumed_at": log.consumed_at.isoformat()  # Convert date to string
        }
        for log in logs
    ]
    
