import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

# Define paths
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "mastery_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "model_features.pkl")

def generate_synthetic_data(n_samples=5000):
    """
    Generates synthetic student interaction data to train a baseline model.
    This ensures the application works out-of-the-box without the massive original dataset.
    """
    print(f"Generating {n_samples} synthetic training samples...")
    
    np.random.seed(42)
    
    # Generate base features
    data = {
        'timeTaken': np.random.exponential(scale=60, size=n_samples), # Avg 60 seconds
        'correct': np.random.choice([0, 1], size=n_samples, p=[0.3, 0.7]), # 70% correct rate
        'attemptCount': np.random.choice([1, 2, 3, 4, 5], size=n_samples, p=[0.6, 0.2, 0.1, 0.05, 0.05]),
        'hintCount': np.random.choice([0, 1, 2, 3], size=n_samples, p=[0.7, 0.15, 0.1, 0.05]),
        'bottomHint': np.random.choice([0, 1], size=n_samples, p=[0.9, 0.1]),
        'scaffold': np.random.choice([0, 1], size=n_samples, p=[0.8, 0.2]),
        
        # Historical features (simulated)
        'frPast5HelpRequest': np.random.beta(2, 5, size=n_samples),
        'frPast8WrongCount': np.random.randint(0, 8, size=n_samples),
        'totalFrPercentPastWrong': np.random.beta(2, 5, size=n_samples),
        'AveCorrect': np.random.beta(7, 3, size=n_samples),
        'AveKnow': np.random.beta(7, 3, size=n_samples),
        'frTimeTakenOnScaffolding': np.random.exponential(scale=30, size=n_samples)
    }
    
    df = pd.DataFrame(data)
    
    # Feature Engineering (Must match ml_engine.py logic)
    df['efficiency'] = df['correct'] / (df['attemptCount'] + 1)
    df['struggle_score'] = df['attemptCount'] * 0.5 + df['hintCount'] * 0.5
    df['time_per_attempt'] = df['timeTaken'] / (df['attemptCount'] + 1)
    
    # Define Target Variable (Mastery Score 0-1)
    # Logic: High correct, low attempts, low hints, high history => High Mastery
    df['mastery_score'] = (
        0.4 * df['correct'] +
        0.2 * df['AveCorrect'] +
        -0.1 * (df['attemptCount'] - 1) + 
        -0.1 * df['hintCount'] +
        -0.05 * (df['timeTaken'] / 100)
    )
    
    # Normalize target to 0-1 range
    df['mastery_score'] = (df['mastery_score'] - df['mastery_score'].min()) / (df['mastery_score'].max() - df['mastery_score'].min())
    
    # Add some noise
    df['mastery_score'] += np.random.normal(0, 0.05, size=n_samples)
    df['mastery_score'] = df['mastery_score'].clip(0, 1)
    
    return df

def train_model():
    print("Initialize training process...")
    
    # 1. Get Data
    df = generate_synthetic_data()
    
    # 2. Prepare Features and Target
    target = 'mastery_score'
    features = [col for col in df.columns if col != target]
    
    X = df[features]
    y = df[target]
    
    print(f"Training with {len(features)} features: {features}")
    
    # 3. Split Data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 4. Train Model
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    # 5. Evaluate
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Model Trained Successfully!")
    print(f"MSE: {mse:.4f}")
    print(f"R2 Score: {r2:.4f}")
    
    # 6. Save Model and Features
    joblib.dump(model, MODEL_PATH)
    joblib.dump(features, FEATURES_PATH)
    
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Features saved to: {FEATURES_PATH}")

if __name__ == "__main__":
    train_model()
