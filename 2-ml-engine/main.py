from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import joblib
import pandas as pd
import numpy as np

app = FastAPI(title="tx.verify - ML Engine (Layer 1)")

# --- 1. Load the Model ---
model = None
try:
    model = joblib.load('model/iso_forest.joblib')
    print("[+] Isolation Forest model loaded into memory.")
except Exception as e:
    print(f"[!] Warning: Could not load model. Running in HEURISTIC mode. Error: {e}")


# --- 2. Define the JSON Payload Structure ---
# Go's MLPayload embeds Transaction (fields at root) + features nested
class UserFeatures(BaseModel):
    spend_24h: float
    is_known_device: bool

class MLPayload(BaseModel):
    # Transaction fields (flattened from Go's embedded struct)
    tx_id: str
    user_id: str
    amount: float
    timestamp: str
    device_id: str
    ip_address: str
    location: Optional[str] = ""
    target_account: str
    # Features (nested)
    features: UserFeatures

# --- 3. The Prediction Endpoint ---
@app.post("/predict")
async def predict_anomaly(payload: MLPayload):
    try:
        # 1. Format the incoming data to match what the model was trained on
        input_data = pd.DataFrame([{
            'amount': payload.amount,
            'spend_24h': payload.features.spend_24h,
            'is_known_device': 1 if payload.features.is_known_device else 0
        }])

        # 2. Run Inference (or heuristic fallback)
        risk_score = 0.0

        if model is not None:
            # prediction: 1 = Normal, -1 = Anomaly
            prediction = model.predict(input_data)
            # raw_score: Negative means anomaly, Positive means normal
            raw_score = model.decision_function(input_data)

            # 3. Convert raw stats to a clean 0-100 Risk Score for the Go Gateway
            if prediction[0] == -1:
                risk_score = min(100.0, 60.0 + (abs(raw_score[0]) * 100))
            else:
                risk_score = max(0.0, 50.0 - (raw_score[0] * 100))
        else:
            # Heuristic fallback when model is not loaded
            risk_score = 20.0  # base score
            if payload.amount > 50000:
                risk_score += 30.0
            if payload.amount > 10000:
                risk_score += 15.0
            if not payload.features.is_known_device:
                risk_score += 20.0
            if payload.features.spend_24h > 0 and payload.amount > (payload.features.spend_24h * 3):
                risk_score += 15.0
            risk_score = min(100.0, risk_score)

        # 4. Simple Heuristic Check (Velocity Spike)
        velocity_spike = False
        if payload.amount > (payload.features.spend_24h * 3) and payload.features.spend_24h > 0:
            velocity_spike = True

        return {
            "anomaly_score": round(float(risk_score), 2),
            "is_new_device": not payload.features.is_known_device,
            "velocity_spike": velocity_spike
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Must run on 8001 so Go (8080) can talk to it!
    uvicorn.run(app, host="0.0.0.0", port=8001)