# ML Feature Engineering Solution

## Problem
The ML model was trained on **15+ features** from the competition dataset, but our web application only collects **4 basic features** (time_taken, correct, attempt_count, hint_count).

## Solution: Dynamic Feature Computation

### Architecture
We implemented a **user history tracking system** that computes advanced features on-the-fly:

```
User Interaction → Store in History → Compute Features → Predict Mastery
```

### How It Works

#### 1. **User History Storage** (`ml_engine.py`)
```python
self.user_histories = {
    "user_123": [
        {"time_taken": 45, "correct": 1, "attempt_count": 1, ...},
        {"time_taken": 120, "correct": 0, "attempt_count": 3, ...},
        ...
    ]
}
```

#### 2. **Feature Computation**
When a prediction is requested, the system:

**From Current Interaction:**
- `timeTaken`, `correct`, `attemptCount`, `hintCount`

**From User History (last 5-20 interactions):**
- `frPast5HelpRequest` - % of recent problems where hints were used
- `frPast8WrongCount` - Number of wrong answers in last 8 problems
- `totalFrPercentPastWrong` - Overall error rate
- `AveCorrect` - Average correctness across all history
- `AveKnow` - Recent performance (proxy for knowledge)

**Engineered Features:**
- `efficiency` = correct / (attempts + 1)
- `struggle_score` = attempts × 0.5 + hints × 0.5
- `time_per_attempt` = time / (attempts + 1)

#### 3. **New User Handling**
For users with no history, we use **neutral default values**:
- `AveCorrect` = 0.5 (50% baseline)
- `frPast8WrongCount` = 2 (moderate errors)
- `totalFrPercentPastWrong` = 0.3 (30% error rate)

### API Usage

**Endpoint**: `POST /predict-mastery`

**Request**:
```json
{
  "user_id": "student_123",
  "time_taken": 45.5,
  "correct": 1,
  "attempt_count": 1,
  "hint_count": 0,
  "bottom_hint": 0,
  "scaffold": 0
}
```

**Response**:
```json
{
  "mastery_score": 0.78
}
```

### Frontend Integration

When a user completes a quiz question, send:
```typescript
const response = await fetch('/predict-mastery', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: currentUser.id,
    time_taken: questionTimer,
    correct: isCorrect ? 1 : 0,
    attempt_count: attemptsMade,
    hint_count: hintsUsed,
    bottom_hint: usedFinalHint ? 1 : 0,
    scaffold: neededHelp ? 1 : 0
  })
});
```

### Benefits
✅ **No Feature Mismatch** - All features are computed from available data  
✅ **Personalized** - Predictions improve as user history grows  
✅ **Scalable** - History limited to last 20 interactions per user  
✅ **Graceful Degradation** - Works for new users with defaults
