import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

def train_model():
    print("Loading PaySim dataset...")
    try:
        df = pd.read_csv('model/PS_20174392719_1491204439457_log.csv').sample(n=200000, random_state=42)
    except FileNotFoundError:
        print("Error: Could not find the PaySim CSV in model/ directory.")
        return

    print("[*] Applying memory optimizations...")
    for col in df.columns:
        if df[col].dtype == 'float64':
            df[col] = pd.to_numeric(df[col], downcast='float')

    print("[*] Engineering Features to match our Go API...")
    
    # 2. spend_24h (We use oldbalanceOrg as a proxy for their recent financial baseline)
    df['spend_24h'] = df['oldbalanceOrg']
    
    # 3. is_known_device (Simulating this since PaySim lacks device IDs)
    # Fraudsters usually use new devices. Good users usually use known devices.
    df['is_known_device'] = np.where(
        df['isFraud'] == 1, 
        np.random.choice([0, 1], size=len(df), p=[0.8, 0.2]), 
        np.random.choice([0, 1], size=len(df), p=[0.05, 0.95])
    )

    features = ['amount', 'spend_24h', 'is_known_device']
    X_train = df[features]

    print("Training the Isolation Forest...")
    model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
    model.fit(X_train)

    # Save the trained model to disk
    os.makedirs('model', exist_ok=True)
    joblib.dump(model, 'model/iso_forest.joblib')
    print("Success! Model trained and saved to model/iso_forest.joblib")

if __name__ == "__main__":
    train_model()