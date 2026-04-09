"""
Cypher query constants for Neo4j fraud graph operations.
These queries operate on a graph model:
  (:Account {id: string, flagged: bool}) -[:SENT_TO {amount: float, tx_id: string}]-> (:Account)
"""

# ─── CHECK HOPS TO FRAUD ─────────────────────────────────────────────
# Finds the shortest path from the target account to ANY flagged fraud node.
# Returns the number of hops (1 = direct connection, 2 = one intermediary).
# Limited to depth 3 for performance.
CHECK_HOPS_TO_FRAUD = """
MATCH (target:Account {id: $target_account})
MATCH (fraud:Account {flagged: true})
WHERE target <> fraud
MATCH path = shortestPath((target)-[:SENT_TO*1..3]-(fraud))
RETURN length(path) AS hops, fraud.id AS flagged_entity
ORDER BY hops ASC
LIMIT 1
"""

# ─── CHECK RING MEMBERSHIP ───────────────────────────────────────────
# Detects if the target account is part of a circular transaction ring.
# A→B→C→A pattern indicates potential money laundering.
CHECK_RING_MEMBERSHIP = """
MATCH (target:Account {id: $target_account})
MATCH ring = (target)-[:SENT_TO*2..4]->(target)
RETURN length(ring) AS ring_size, [n IN nodes(ring) | n.id] AS ring_members
LIMIT 1
"""

# ─── CHECK ACCOUNT EXISTS ────────────────────────────────────────────
CHECK_ACCOUNT_EXISTS = """
MATCH (a:Account {id: $account_id})
RETURN a.id AS id, a.flagged AS flagged
"""

# ─── SEED: CREATE ACCOUNTS ───────────────────────────────────────────
SEED_CREATE_ACCOUNT = """
MERGE (a:Account {id: $account_id})
SET a.flagged = $flagged
RETURN a.id AS id
"""

# ─── SEED: CREATE TRANSACTION EDGE ───────────────────────────────────
SEED_CREATE_EDGE = """
MATCH (sender:Account {id: $sender_id})
MATCH (receiver:Account {id: $receiver_id})
MERGE (sender)-[:SENT_TO {amount: $amount, tx_id: $tx_id}]->(receiver)
"""
