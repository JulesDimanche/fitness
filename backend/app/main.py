from sqlalchemy import text
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from app.models import UserData, WorkoutTemplate, WorkoutTemplateExercise, WorkoutTemplateSet
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
from app.models import WorkoutSession, WorkoutExercise, WorkoutSet,Exercise
from app.food_db import FoodSessionLocal
from app.schemas import FoodSuggestion,FoodLogUpdate,ExerciseSuggestion, UpdateWorkoutSet
from fastapi import Query
from sqlalchemy import cast, Date
from app.exercise_db import ExerciseSessionLocal
from sqlalchemy import func

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

def get_exercise_db():
    db = ExerciseSessionLocal()
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
def analyze_user(data: UserData):
    height_m = data.height / 100
    bmi = round(data.weight / (height_m ** 2), 2)

    if bmi < 18.5:
        status = "Underweight"
    elif 18.5 <= bmi < 25:
        status = "Normal"
    elif 25 <= bmi < 30:
        status = "Overweight"
    else:
        status = "Obese"

    if data.gender == "male":
        bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5
    else:
        bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161
    protein_per_kg = 2.0  # g/kg
    fat_ratio = 0.25      # 25% of total calories
    activity_map = {"low": 1.2, "medium": 1.55, "high": 1.9}
    tdee = round(bmr * activity_map.get(data.activity, 1.2))

    weight_diff = data.target_weight - data.weight
    duration_weeks = int(data.target_duration * 4)
    kg_per_week = weight_diff / duration_weeks
    calorie_change_per_week = kg_per_week * 7700
    required_calories = round(tdee + calorie_change_per_week / 7)

    weekly_progress = []
    for week in range(1, duration_weeks + 1):
        projected_weight = round(data.weight + kg_per_week * week, 1)
        temp_bmr = 10 * projected_weight + 6.25 * data.height - 5 * data.age + (5 if data.gender == "male" else -161)
        temp_tdee = round(temp_bmr * activity_map.get(data.activity, 1.2))
        temp_required = round(temp_tdee + calorie_change_per_week / 7)
        protein_grams = round(protein_per_kg * projected_weight)
        fat_grams = round((fat_ratio * temp_required) / 9)
        weekly_progress.append({
            "week": week,
            "weight": projected_weight,
            "required_calories": temp_required,
            "target_protein": protein_grams,
            "target_fat": fat_grams
        })

    if weight_diff > 0:
        suggestion = f"Aim to gain {kg_per_week:.2f} kg/week. Increase calories gradually."
    elif weight_diff < 0:
        suggestion = f"Aim to lose {abs(kg_per_week):.2f} kg/week. Reduce calories moderately."
    else:
        suggestion = "You are already at your target weight."

    return {
        "bmi": bmi,
        "status": status,
        "Maintanence_calories": tdee,
        "required_calories": required_calories,
        "weekly_change": round(kg_per_week, 2),
        "weekly_progress": weekly_progress,
        "suggestion": suggestion
    }
from fastapi import Body

@app.post("/save_analysis")
def save_analysis(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Goal).filter(Goal.user_id == current_user.id).delete()
    db.query(Progress).filter(Progress.user_id == current_user.id).delete()
    db.commit()
    
    start_weight = data["start_weight"]
    target_weight = data["target_weight"]
    duration_weeks = len(data["weekly_progress"])
    goal_type = "gain" if target_weight > start_weight else "lose" if target_weight < start_weight else "maintain"

    goal = Goal(
        user_id=current_user.id,
        target_weight=target_weight,
        duration_weeks=duration_weeks,
        goal_type=goal_type,
        start_weight=start_weight
    )
    db.add(goal)
    db.flush()

    for entry in data["weekly_progress"]:
        progress = Progress(
            user_id=current_user.id,
            week=entry["week"],
            weight=entry["weight"],
            date=datetime.now() + timedelta(weeks=entry["week"]),
            calories=entry.get("required_calories", 0),
            protein=entry.get("target_protein", 0),
            fat=entry.get("target_fat", 0)
        )
        db.add(progress)

    db.commit()
    return {"message": "Analysis saved successfully"}

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
    raw_adjustment = (-weight_diff * 7700) / 7

# Dampening factor: scale it down to prevent overadjustment
    if abs(weight_diff) < 0.1:
        dampening_factor = 0.0
    elif abs(weight_diff) < 0.25:
        dampening_factor = 0.25
    else:
        dampening_factor = 0.35

    calorie_adjustment = round(raw_adjustment * dampening_factor)

    if abs(calorie_adjustment) < 50:
        suggestion = "Maintain"
    elif calorie_adjustment > 0:
        suggestion = f"Increase calories by {calorie_adjustment} kcal/day"
    else:
        suggestion = f"Decrease calories by {abs(calorie_adjustment)} kcal/day"

    # Update or create current week with actual weight (but do not store calories here)
    progress_entry = db.query(models.Progress).filter(
        models.Progress.user_id == current_user.id,
        models.Progress.week == week
    ).first()

    if progress_entry:
        progress_entry.actual_weight = actual_weight
        progress_entry.date = date.today()
        # Do not set calories here
    else:
        progress_entry = models.Progress(
            user_id=current_user.id,
            week=week,
            weight=None,
            actual_weight=actual_weight,
            calories=None,
            date=date.today()
        )
        db.add(progress_entry)

    # Apply calorie adjustment to all future weeks
    protein_per_kg = 2.0
    fat_ratio = 0.25

    for w in range(week + 1, latest_goal.duration_weeks + 1):
        future_entry = db.query(models.Progress).filter(
            models.Progress.user_id == current_user.id,
            models.Progress.week == w
        ).first()

        # Estimate updated calories
        updated_calories = calorie_adjustment
        if future_entry and future_entry.calories:
            updated_calories += future_entry.calories

        # Estimate weight for protein calc
        estimated_weight = round(start_weight + kg_per_week * w, 1)
        updated_protein = round(protein_per_kg * estimated_weight)
        updated_fat = round((fat_ratio * updated_calories) / 9)

        if future_entry:
            future_entry.calories = updated_calories
            future_entry.protein = updated_protein
            future_entry.fat = updated_fat
        else:
            db.add(models.Progress(
                user_id=current_user.id,
                week=w,
                weight=None,
                actual_weight=None,
                calories=updated_calories,
                protein=updated_protein,
                fat=updated_fat,
                date=None
            ))


    db.commit()

    return {
        "week": week,
        "actual_weight": actual_weight,
        "expected_weight": expected_weight,
        "calorie_adjustment": calorie_adjustment,
        "suggestion": f"{suggestion} calories by {abs(calorie_adjustment)} kcal/day (applied from week {week + 1})"
    }

@app.get("/weekly-plan")
def get_weekly_plan(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(models.Progress).filter(
        models.Progress.user_id == current_user.id
    ).order_by(models.Progress.week).all()

    return [
        {
            "week": p.week,
            "target_weight": p.weight,
            "calories": p.calories,
            "protein": p.protein,
            "fat": p.fat
        }
        for p in plan
    ]

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
@app.get("/workouts_by_date")
async def get_workouts_by_date(
    date: str=None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if date is None:
        target_date = dt_date.today()
    else:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .filter(func.date(WorkoutSession.date) == target_date)
        .all()
    )

    all_logs = []
    for session in sessions:
        for exercise in session.exercises:
            sets = [
                {
                    "id": s.id,
                    "set_number": s.set_number,
                    "reps": s.reps,
                    "weight": s.weight
                }
                for s in exercise.sets
            ]
            all_logs.append({
                "exercise_name": exercise.exercise_name,
                "sets": sets
            })

    return {"date": target_date, "exercises": all_logs}

@app.put("/update_workout_set")
async def update_workout_set(
    update_data: UpdateWorkoutSet,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        workout_date = datetime.strptime(update_data.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    session = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .filter(func.date(WorkoutSession.date) == workout_date)
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")

    exercise = (
        db.query(WorkoutExercise)
        .filter(WorkoutExercise.session_id == session.id)
        .filter(WorkoutExercise.exercise_name == update_data.exercise_name)
        .first()
    )

    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    workout_set = (
        db.query(WorkoutSet)
        .filter(WorkoutSet.exercise_id == exercise.id)
        .filter(WorkoutSet.set_number == update_data.set_number)
        .first()
    )

    if not workout_set:
        raise HTTPException(status_code=404, detail="Workout set not found")

    workout_set.reps = update_data.new_reps
    workout_set.weight = update_data.new_weight

    db.commit()
    db.refresh(workout_set)

    return {"message": "Workout set updated successfully"}

@app.delete("/delete_workout_set")
async def delete_workout_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workout_set = db.query(WorkoutSet).filter_by(id=set_id).first()

    if not workout_set:
        raise HTTPException(status_code=404, detail="Set not found.")

    # Ensure it's this user's set
    exercise = db.query(WorkoutExercise).filter_by(id=workout_set.exercise_id).first()
    session = db.query(WorkoutSession).filter_by(id=exercise.session_id).first()

    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    db.delete(workout_set)
    db.commit()

    # Cleanup: delete exercise if no sets remain
    remaining_sets = db.query(WorkoutSet).filter_by(exercise_id=exercise.id).count()
    if remaining_sets == 0:
        db.delete(exercise)
        db.commit()

    # ✅ Delete session if no exercises remain
        remaining_exercises = db.query(WorkoutExercise).filter_by(session_id=session.id).count()
        if remaining_exercises == 0:
            db.delete(session)
            db.commit()
            return {"message": "Set deleted and session removed (no sets left)"}

        return {"message": "Set deleted and exercise removed (no sets left)"}


    return {"message": "Workout set deleted successfully"}

@app.delete("/delete_exercise")
async def delete_exercise(
    exercise_name: str,
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        session_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    session = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .filter(func.date(WorkoutSession.date) == session_date)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")

    exercise = (
        db.query(WorkoutExercise)
        .filter(WorkoutExercise.session_id == session.id)
        .filter(WorkoutExercise.exercise_name == exercise_name)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    db.delete(exercise)
    #db.commit()

    # ✅ Delete session if no exercises remain
    remaining_exercises = db.query(WorkoutExercise).filter_by(session_id=session.id).count()
    if remaining_exercises == 0:
        db.delete(session)
    db.commit()
        #return {"message": "Exercise and session deleted (no exercises left)"}

    return {"message": "Exercise deleted successfully"}


@app.post("/save_template")
async def save_template(
    template_data: schemas.WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print("Received template:", template_data)
    template = WorkoutTemplate(user_id=current_user.id, name=template_data.name)

    for ex in template_data.exercises:
        ex_model = WorkoutTemplateExercise(exercise_name=ex.exercise_name)
        for s in ex.sets:
            ex_model.sets.append(
                WorkoutTemplateSet(set_number=s.set_number, reps=s.reps, weight=s.weight)
            )
        template.exercises.append(ex_model)

    db.add(template)
    db.commit()
    db.refresh(template)
    print("Template saved.")

    return {"message": "Template saved", "template_id": template.id}

@app.put("/workout_templates/{template_id}")
async def update_template(
    template_id: int,
    updated_data: schemas.WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"🔄 Updating template ID {template_id}")

    # Fetch the template owned by current user
    template = (
        db.query(WorkoutTemplate)
        .filter_by(id=template_id, user_id=current_user.id)
        .first()
    )

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update template name
    template.name = updated_data.name

    # Clear old exercises & sets (via cascade delete)
    for exercise in template.exercises:
        db.delete(exercise)

    db.commit()

    # Add new exercises and sets
    for ex in updated_data.exercises:
        ex_model = WorkoutTemplateExercise(exercise_name=ex.exercise_name)
        for s in ex.sets:
            ex_model.sets.append(
                WorkoutTemplateSet(set_number=s.set_number, reps=s.reps, weight=s.weight)
            )
        template.exercises.append(ex_model)

    db.commit()
    db.refresh(template)

    print(f"✅ Template {template_id} updated")
    return {"message": "Template updated", "template_id": template.id}


@app.get("/workout_templates", response_model=List[schemas.WorkoutTemplateOut])
async def get_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    templates = db.query(WorkoutTemplate).filter_by(user_id=current_user.id).all()
    return templates


@app.get("/workout_templates/{template_id}")
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = (
        db.query(WorkoutTemplate)
        .filter_by(id=template_id, user_id=current_user.id)
        .first()
    )

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return {
        "name": template.name,
        "exercises": [
            {
                "exercise_name": ex.exercise_name,
                "sets": [
                    {"set_number": s.set_number, "reps": s.reps, "weight": s.weight}
                    for s in ex.sets
                ]
            }
            for ex in template.exercises
        ]
    }
@app.delete("/workout_templates/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = db.query(WorkoutTemplate).filter_by(id=template_id, user_id=current_user.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}


@app.get("/search_exercises", response_model=List[ExerciseSuggestion])
def search_exercises(
    query: str, 
    db: Session = Depends(get_exercise_db)
):
    if len(query) < 2:
        raise HTTPException(
            status_code=400, 
            detail="Query must be at least 2 characters long"
        )

    exercises = db.query(Exercise).filter(
        Exercise.exercise_name.ilike(f"%{query}%")
    ).limit(10).all()

    if not exercises:
        print("No exercises found for query:", query)
    
    return exercises
@app.get("/workout_logged_dates")
def get_logged_workout_dates(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dates = (
        db.query(WorkoutSession.date)
        .filter(WorkoutSession.user_id == user.id)
        .distinct()
        .all()
    )
    return [str(d[0]) for d in dates]
@app.get("/recent_workouts")
def recent_workouts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get latest 3 unique workout days for the user
    recent_dates = (
        db.query(func.date(WorkoutSession.date))
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.date.desc())
        .distinct(func.date(WorkoutSession.date))
        .limit(3)
        .all()
    )

    result = []
    for (workout_date,) in recent_dates:
        # All sessions on that day
        sessions = (
            db.query(WorkoutSession)
            .filter(
                WorkoutSession.user_id == current_user.id,
                func.date(WorkoutSession.date) == workout_date
            )
            .all()
        )

        day_summary = {
            "date": str(workout_date),
            "sessions": []
        }

        for session in sessions:
            exercise_names = [ex.exercise_name for ex in session.exercises]

            summary_name = ", ".join(exercise_names[:2]) if exercise_names else "Unknown"
            emoji = "🏋️"
            if any("Chest" in ex for ex in exercise_names):
                emoji = "💪"
            elif any("Leg" in ex for ex in exercise_names):
                emoji = "🦵"
            elif any("Cardio" in ex for ex in exercise_names):
                emoji = "🏃"

            day_summary["sessions"].append({
                "name": summary_name,
                "emoji": emoji,
                "template": getattr(session, "name", None),  # If session has template name
                "duration": 45  # Estimated for now
            })

        result.append(day_summary)

    return result

#food
from app.schemas import LogFoodRequest
from app.models import UserConsumption, FoodItem, Base

food_session_local = FoodSessionLocal

@app.post("/log-food")
def log_food(request: LogFoodRequest, current_user: User = Depends(get_current_user)):
    food_session: Session = food_session_local()
    session: Session = SessionLocal()

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
            meal_time=request.meal_time,
            quantity=request.quantity,
            grams=grams,
            calories=calories,
            protein=protein,
            fat=fat,
            carbs=carbs,
            consumed_at=consumed_at
        )
        session.add(new_entry)
        session.commit()

        # Return the new entry data so frontend can immediately display it
        return {
            "message": "Food logged successfully",
            "food_log": {
                "id": new_entry.id,
                "food_name": new_entry.food_name,
                "meal_time":new_entry.meal_time,
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
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        food_session.close()
        session.close()


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
            "id": log.id, 
            "food_name": log.food_name,
            "meal_time":log.meal_time,
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
    
@app.put("/update-food-log/{log_id}")
def update_food_log(
    log_id: int,
    update: FoodLogUpdate,
    db: Session = Depends(get_db),
    food_db: Session = Depends(get_food_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch the existing log
    food_log = db.query(UserConsumption).filter(
        UserConsumption.id == log_id,
        UserConsumption.user_id == current_user.id
    ).first()

    if not food_log:
        raise HTTPException(status_code=404, detail="Food log not found.")

    # Track if we need to recalculate nutrition
    recalculate_nutrition = False

    # Update food name if changed
    if update.food_name is not None and update.food_name != food_log.food_name:
        food_log.food_name = update.food_name
        recalculate_nutrition = True

    # Handle quantity/grams updates
    if update.quantity is not None:
        if update.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")
        food_log.quantity = update.quantity
        recalculate_nutrition = True

    if update.grams is not None:
        if update.grams <= 0:
            raise HTTPException(status_code=400, detail="Grams must be positive")
        food_log.grams = update.grams
        recalculate_nutrition = True

    # If we updated food name or quantity/grams, we need to:
    # 1. Get the new food item data
    # 2. Recalculate nutrition values
    if recalculate_nutrition:
        food_item = food_db.query(FoodItem).filter(
            FoodItem.food_item == food_log.food_name
        ).first()

        if not food_item:
            raise HTTPException(status_code=404, detail="Food item not found in food database.")

        # Ensure quantity and grams are in sync
        if update.quantity is not None and update.grams is None:
            food_log.grams = round(update.quantity * food_item.serving_grams, 2)
        elif update.grams is not None and update.quantity is None:
            food_log.quantity = round(update.grams / food_item.serving_grams, 2)
        elif update.quantity is not None and update.grams is not None:
            # If both are provided, prioritize quantity and recalculate grams
            food_log.grams = round(update.quantity * food_item.serving_grams, 2)

        # Recalculate all nutrition values
        food_log.calories = round(food_log.quantity * food_item.calories, 2)
        food_log.protein = round(food_log.quantity * food_item.protein, 2)
        food_log.fat = round(food_log.quantity * food_item.fat, 2)
        food_log.carbs = round(food_log.quantity * food_item.carbs, 2)

    db.commit()
    db.refresh(food_log)

    return {
        "message": "Food log updated successfully",
        "log": {
            "id": food_log.id,
            "food_name": food_log.food_name,
            "quantity": food_log.quantity,
            "grams": food_log.grams,
            "calories": food_log.calories,
            "protein": food_log.protein,
            "fat": food_log.fat,
            "carbs": food_log.carbs
        }
    }

@app.delete("/delete-food-log/{log_id}")
def delete_food_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    food_log = db.query(UserConsumption).filter(
        UserConsumption.id == log_id,
        UserConsumption.user_id == current_user.id
    ).first()

    if not food_log:
        raise HTTPException(status_code=404, detail="Food log not found.")

    db.delete(food_log)
    db.commit()

    return {"message": "Food log deleted successfully"}
@app.get("/logged-dates")
def get_logged_dates(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = (
        db.query(UserConsumption.consumed_at)
        .filter(UserConsumption.user_id == user.id)
        .distinct()
        .order_by(UserConsumption.consumed_at.desc())
        .all()
    )
    return [str(row[0]) for row in result]
@app.get("/today-target")
def get_today_target(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.today().date()
    progress = (
        db.query(models.Progress)
        .filter(models.Progress.user_id == current_user.id)
        .filter(models.Progress.date <= today)
        .order_by(models.Progress.date.desc())
        .first()
    )

    if not progress:
        raise HTTPException(status_code=404, detail="No progress data found for today")

    return {
        "week": progress.week,
        "calories": progress.calories,
        "protein": progress.protein,
        "fat": progress.fat
    }
@app.get("/target-for-date")
def get_target_for_date(
    date: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    try:
        selected_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    # Get all progress entries sorted by date
    all_progress = (
        db.query(Progress)
        .filter(Progress.user_id == user.id)
        .order_by(Progress.date.asc())
        .all()
    )

    if not all_progress:
        raise HTTPException(status_code=404, detail="No progress data found")

    # Case 1: Selected date is before the first week
    if selected_date < all_progress[0].date:
        progress = all_progress[0]

    else:
        # Find the most recent progress before or on the selected date
        progress = None
        for p in all_progress:
            if p.date <= selected_date:
                progress = p
            else:
                break

        # Fallback: If none matched somehow (shouldn't happen), default to first
        if not progress:
            progress = all_progress[0]

    return {
        "calories": progress.calories,
        "protein": progress.protein,
        "fat": progress.fat
    }