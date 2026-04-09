import os
import time
import pandas as pd
import redis
from neo4j import GraphDatabase

# Config
CSV_PATH = "2-ml-engine/model/PS_20174392719_1491204439457_log.csv"
REDIS_HOST = "localhost"
REDIS_PORT = 6379
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "txverify123"

def seed_database():
    print("[*] Connecting to Redis...")
    rdb = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
    rdb.ping()
    
    print(f"[*] Connecting to Neo4j at {NEO4J_URI}...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    print("[*] Loading Kaggle Dataset...")
    df = pd.read_csv(CSV_PATH)
    
    print("[*] Filtering Dataset (All Fraud + 5000 random clean transactions)...")
    fraud_df = df[df['isFraud'] == 1]
    clean_df = df[df['isFraud'] == 0].sample(n=5000, random_state=42)
    sample_df = pd.concat([fraud_df, clean_df]).sample(frac=1, random_state=42) # Shuffle
    
    print(f"[*] Processing {len(sample_df)} total transactions...")
    
    now = time.time()
    redis_pipeline = rdb.pipeline()
    
    neo4j_queries = []
    
    # Track accounts we've flagged to avoid duplicates
    flagged_accounts = set(fraud_df['nameOrig'].unique()).union(set(fraud_df['nameDest'].unique()))
    
    for idx, row in sample_df.iterrows():
        tx_id = f"KAGGLE-{row['step']}-{idx}"
        sender = row['nameOrig']
        receiver = row['nameDest']
        amount = float(row['amount'])
        is_fraud = row['isFraud'] == 1
        
        # 1. Redis: Store oldbalanceOrg as the realistic recent historical spend
        # so when we simulate this user, they have their Kaggle baseline!
        baseline = float(row['oldbalanceOrg'])
        if baseline > 0:
            spend_key = f"user:{sender}:spend_history"
            # Add with current timestamp so it's valid within the 24h window for the Go Gateway
            redis_pipeline.zadd(spend_key, {f"{baseline}_{now}": now})
            
        # 2. Neo4j: Prepare Cypher parameters
        neo4j_queries.append({
            "sender": sender,
            "receiver": receiver,
            "amount": amount,
            "tx_id": tx_id,
            "sender_flagged": sender in flagged_accounts,
            "receiver_flagged": receiver in flagged_accounts
        })
        
    print("[*] Executing Redis Pipeline...")
    redis_pipeline.execute()
    
    print("[*] Clearing existing Neo4j graph...")
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
        
    print("[*] Batch inserting into Neo4j (this may take a few seconds)...")
    insert_query = """
    UNWIND $batch AS tx
    MERGE (s:Account {id: tx.sender})
    ON CREATE SET s.flagged = tx.sender_flagged
    ON MATCH SET s.flagged = s.flagged OR tx.sender_flagged
    MERGE (r:Account {id: tx.receiver})
    ON CREATE SET r.flagged = tx.receiver_flagged
    ON MATCH SET r.flagged = r.flagged OR tx.receiver_flagged
    MERGE (s)-[:SENT_TO {amount: tx.amount, tx_id: tx.tx_id}]->(r)
    """
    
    # Chunk into batches of 1000
    batch_size = 1000
    with driver.session() as session:
        for i in range(0, len(neo4j_queries), batch_size):
            batch = neo4j_queries[i:i+batch_size]
            session.run(insert_query, batch=batch)
            print(f"    -> Inserted batch {i//batch_size + 1}")
            
    driver.close()
    
    print("\n[+] SUCCESS! Kaggle data successfully seeded into Redis & Neo4j.")
    
    print("\n[!] IMPORTANT! Here are some real FRAUD senders you can test in the UI:")
    print("----------------------------------------------------------------------")
    print(fraud_df[['nameOrig', 'nameDest', 'amount']].head(5).to_string(index=False))

if __name__ == "__main__":
    seed_database()
