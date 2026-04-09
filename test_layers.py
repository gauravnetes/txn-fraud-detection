import urllib.request
import json

def test_layer1():
    url = "http://localhost:8001/predict"
    payload = {
        "tx_id": "L1-TEST", "user_id": "USR-1", "amount": 95000.00,
        "timestamp": "2026-04-09T12:00:00Z", "device_id": "DEV-1",
        "ip_address": "127.0.0.1", "location": "NY", "target_account": "ACC-2",
        "features": {"spend_24h": 0.0, "is_known_device": False}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            print("[L1 ML Engine]:", resp.read().decode())
    except Exception as e:
        print("[L1 ML Engine Error]:", e)

def test_layer2():
    url = "http://localhost:8002/check-network"
    payload = {
        "tx_id": "L2-TEST", "user_id": "USR-1", "amount": 500.00,
        "timestamp": "2026-04-09T12:00:00Z", "device_id": "DEV-1",
        "ip_address": "127.0.0.1", "location": "NY", "target_account": "FRAUD-ACC-001"
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            print("[L2 Graph Engine]:", resp.read().decode())
    except Exception as e:
        print("[L2 Graph Engine Error]:", e)

def test_layer3():
    url = "http://localhost:8003/evaluate"
    payload = {
        "transaction": {
            "tx_id": "L3-TEST", "user_id": "USR-1", "amount": 95000.00,
            "timestamp": "2026-04-09T12:00:00Z", "device_id": "DEV-1",
            "ip_address": "127.0.0.1", "location": "NY", "target_account": "FRAUD-ACC-001"
        },
        "layer_1_result": {"anomaly_score": 85.5, "is_new_device": True, "velocity_spike": True},
        "layer_2_result": {"network_risk": "HIGH", "hops_to_fraud": 1, "ring_detected": False}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            print("[L3 Reasoning Engine]:", resp.read().decode())
    except Exception as e:
        print("[L3 Reasoning Engine Error]:", e)

def test_gateway():
    url = "http://localhost:8080/api/v1/verify"
    payload = {
        "tx_id": "TXN-GATEWAY-1", "user_id": "USR-42", "amount": 95000.00,
        "timestamp": "2026-04-09T12:00:00Z", "device_id": "UNKNOWN-DEVICE-X",
        "ip_address": "192.168.1.100", "location": "Lagos,NG", "target_account": "FRAUD-ACC-001"
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            print("[Gateway /verify]:", resp.read().decode())
    except Exception as e:
        print("[Gateway /verify Error]:", e)

def test_gateway_preflight():
    url = "http://localhost:8080/api/v1/check-recipient?account=MULE-ACC-001"
    req = urllib.request.Request(url, method="GET") # Default is GET, explicitly stating for clarity
    try:
        with urllib.request.urlopen(req) as resp:
            print("[Gateway /check-recipient]:", resp.read().decode())
    except Exception as e:
        print("[Gateway /check-recipient Error]:", e)


if __name__ == "__main__":
    print("Testing Layers...")
    test_layer1()
    test_layer2()
    test_layer3()
    test_gateway()
    test_gateway_preflight()
    print("Done!")
