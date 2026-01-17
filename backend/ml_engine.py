import joblib
import os
import pandas as pd
import numpy as np
from typing import Dict, List, Optional

# Path to the trained model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "mastery_model.pkl")
FEATURES_PATH = os.path.join(os.path.dirname(__file__), "model_features.pkl")

class MLEngine:
    def __init__(self):
        self.model = None
        self.feature_names = None
        self.user_histories = {}  # Store per-user interaction history
        self.load_model()

    def load_model(self):
        """Loads the trained model and feature list."""
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                print(f"ML Model loaded successfully from {MODEL_PATH}")
            except Exception as e:
                print(f"Error loading ML model: {e}")
        else:
            print(f"Warning: ML model not found at {MODEL_PATH}")
        
        if os.path.exists(FEATURES_PATH):
            try:
                self.feature_names = joblib.load(FEATURES_PATH)
                print(f"Feature list loaded: {len(self.feature_names)} features")
            except Exception as e:
                print(f"Error loading features: {e}")
                self.feature_names = ['timeTaken', 'correct', 'attemptCount', 'hintCount']

    def update_user_history(self, user_id: str, interaction: Dict):
        """
        Store user interaction for computing historical features.
        
        Args:
            user_id: Unique user identifier
            interaction: Dict with keys: timeTaken, correct, attemptCount, hintCount, bottomHint, scaffold
        """
        if user_id not in self.user_histories:
            self.user_histories[user_id] = []
        
        self.user_histories[user_id].append(interaction)
        
        # Keep only last 20 interactions to save memory
        if len(self.user_histories[user_id]) > 20:
            self.user_histories[user_id] = self.user_histories[user_id][-20:]

    def compute_features(self, user_id: str, current_interaction: Dict) -> Dict:
        """
        Compute all required features from user history + current interaction.
        
        Args:
            user_id: User identifier
            current_interaction: Current problem attempt data
            
        Returns:
            Dict with all features needed by the model
        """
        history = self.user_histories.get(user_id, [])
        
        # Base features (from current interaction)
        features = {
            'timeTaken': current_interaction.get('time_taken', 0),
            'correct': current_interaction.get('correct', 0),
            'attemptCount': current_interaction.get('attempt_count', 1),
            'hintCount': current_interaction.get('hint_count', 0),
            'bottomHint': current_interaction.get('bottom_hint', 0),
            'scaffold': current_interaction.get('scaffold', 0)
        }
        
        # Compute historical features from past interactions
        if len(history) > 0:
            recent_5 = history[-5:]
            recent_8 = history[-8:]
            
            # Help requests in past 5
            features['frPast5HelpRequest'] = sum(1 for h in recent_5 if h.get('hint_count', 0) > 0) / max(len(recent_5), 1)
            
            # Wrong count in past 8
            features['frPast8WrongCount'] = sum(1 for h in recent_8 if h.get('correct', 0) == 0)
            
            # Overall error rate
            total_wrong = sum(1 for h in history if h.get('correct', 0) == 0)
            features['totalFrPercentPastWrong'] = total_wrong / len(history)
            
            # Average correctness
            features['AveCorrect'] = sum(h.get('correct', 0) for h in history) / len(history)
            
            # Average knowledge (proxy: recent correctness)
            features['AveKnow'] = sum(h.get('correct', 0) for h in recent_5) / max(len(recent_5), 1)
            
            # Scaffolding time (if available)
            scaffold_times = [h.get('time_taken', 0) for h in history if h.get('scaffold', 0) == 1]
            features['frTimeTakenOnScaffolding'] = np.mean(scaffold_times) if scaffold_times else 0
        else:
            # Default values for new users (neutral/average)
            features['frPast5HelpRequest'] = 0.3
            features['frPast8WrongCount'] = 2
            features['totalFrPercentPastWrong'] = 0.3
            features['AveCorrect'] = 0.5
            features['AveKnow'] = 0.5
            features['frTimeTakenOnScaffolding'] = 0
        
        # Engineered features
        features['efficiency'] = features['correct'] / (features['attemptCount'] + 1)
        features['struggle_score'] = features['attemptCount'] * 0.5 + features['hintCount'] * 0.5
        features['time_per_attempt'] = features['timeTaken'] / (features['attemptCount'] + 1)
        
        return features

    def predict_mastery(self, user_id: str, time_taken: float, correct: int, 
                       attempt_count: int, hint_count: int, 
                       bottom_hint: int = 0, scaffold: int = 0) -> float:
        """
        Predicts the mastery score for a user's interaction.
        
        Args:
            user_id: User identifier for history tracking
            time_taken: Time taken in seconds
            correct: 1 if correct, 0 otherwise
            attempt_count: Number of attempts
            hint_count: Number of hints used
            bottom_hint: 1 if bottom-out hint used, 0 otherwise
            scaffold: 1 if scaffolding was needed, 0 otherwise
            
        Returns:
            float: Predicted mastery score (0.0 to 1.0)
        """
        if not self.model:
            # Fallback heuristic
            score = 0.5
            if correct == 1:
                score += 0.3
            score -= (attempt_count - 1) * 0.1
            score -= hint_count * 0.1
            return max(0.0, min(1.0, score))

        # Current interaction data
        current_interaction = {
            'time_taken': time_taken,
            'correct': correct,
            'attempt_count': attempt_count,
            'hint_count': hint_count,
            'bottom_hint': bottom_hint,
            'scaffold': scaffold
        }
        
        # Compute all features
        feature_dict = self.compute_features(user_id, current_interaction)
        
        # Update history AFTER prediction (so next prediction uses this)
        self.update_user_history(user_id, current_interaction)
        
        # Create DataFrame with features in correct order
        if self.feature_names:
            feature_values = [feature_dict.get(fname, 0) for fname in self.feature_names]
            features_df = pd.DataFrame([feature_values], columns=self.feature_names)
        else:
            features_df = pd.DataFrame([feature_dict])
        
        try:
            prediction = self.model.predict(features_df)[0]
            return float(np.clip(prediction, 0.0, 1.0))
        except Exception as e:
            print(f"Prediction error: {e}")
            return 0.5
