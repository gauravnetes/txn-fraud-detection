"""
Seed script for Neo4j — creates test accounts and fraud relationships.
Run this once after Neo4j is up to populate the graph for testing.

Usage:
    cd 3-graph-engine
    python seed_graph.py
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "txverify123")

# ─── Test Data ────────────────────────────────────────────────────────
# Graph structure:
#
#   LEGIT-ACC-001 ──► MULE-ACC-001 ──► FRAUD-ACC-001 (flagged)
#                                  ──► FRAUD-ACC-002 (flagged)
#   LEGIT-ACC-002 ──► LEGIT-ACC-003 (clean, no fraud connections)
#   RING-ACC-001  ──► RING-ACC-002 ──► RING-ACC-003 ──► RING-ACC-001 (ring!)
#

ACCOUNTS = [
    # (account_id, is_flagged)
    ("FRAUD-ACC-001", True),
    ("FRAUD-ACC-002", True),
    ("MULE-ACC-001", False),   # 1 hop from fraud
    ("LEGIT-ACC-001", False),  # 2 hops from fraud (via mule)
    ("LEGIT-ACC-002", False),  # clean
    ("LEGIT-ACC-003", False),  # clean
    ("RING-ACC-001", False),   # ring member
    ("RING-ACC-002", False),   # ring member
    ("RING-ACC-003", False),   # ring member
]

TRANSACTIONS = [
    # (sender, receiver, amount, tx_id)
    ("MULE-ACC-001", "FRAUD-ACC-001", 50000.0, "SEED-TX-001"),
    ("MULE-ACC-001", "FRAUD-ACC-002", 30000.0, "SEED-TX-002"),
    ("LEGIT-ACC-001", "MULE-ACC-001", 75000.0, "SEED-TX-003"),
    ("LEGIT-ACC-002", "LEGIT-ACC-003", 1000.0, "SEED-TX-004"),
    # Ring transactions
    ("RING-ACC-001", "RING-ACC-002", 10000.0, "SEED-TX-005"),
    ("RING-ACC-002", "RING-ACC-003", 9500.0, "SEED-TX-006"),
    ("RING-ACC-003", "RING-ACC-001", 9000.0, "SEED-TX-007"),
]


def seed():
    print(f"Connecting to Neo4j at {NEO4J_URI}...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    with driver.session() as session:
        # Clear existing data
        print("[*] Clearing existing graph data...")
        session.run("MATCH (n) DETACH DELETE n")

        # Create accounts
        for acc_id, flagged in ACCOUNTS:
            session.run(
                "MERGE (a:Account {id: $id}) SET a.flagged = $flagged",
                id=acc_id, flagged=flagged
            )
            status = "[!] FRAUD" if flagged else "[+] Clean"
            print(f"  Created account: {acc_id} [{status}]")

        # Create transaction edges
        for sender, receiver, amount, tx_id in TRANSACTIONS:
            session.run(
                """
                MATCH (s:Account {id: $sender})
                MATCH (r:Account {id: $receiver})
                MERGE (s)-[:SENT_TO {amount: $amount, tx_id: $tx_id}]->(r)
                """,
                sender=sender, receiver=receiver, amount=amount, tx_id=tx_id
            )
            print(f"  Created edge: {sender} --({amount})--> {receiver}")

    driver.close()
    print("\n[+] Graph seeded successfully!")
    print("\nExpected results:")
    print("  FRAUD-ACC-001  -> HIGH risk (directly flagged)")
    print("  MULE-ACC-001   -> HIGH risk (1 hop to FRAUD-ACC-001)")
    print("  LEGIT-ACC-001  -> MEDIUM risk (2 hops via MULE-ACC-001)")
    print("  LEGIT-ACC-002  -> LOW risk (no fraud connections)")
    print("  RING-ACC-001   -> MEDIUM risk (ring member)")


if __name__ == "__main__":
    seed()
