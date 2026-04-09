"""
Kafka consumer for real-time graph ingestion.
Consumes transaction events and writes nodes/edges into Neo4j.

This is a standalone process — not part of the API server.
It would run in production to keep the fraud graph up-to-date.

Usage:
    cd 3-graph-engine
    python -m ingestion.consumer
"""

import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [INGESTION] %(message)s")
logger = logging.getLogger(__name__)

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "txverify123")
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "transactions")


def ingest_transaction(session, tx: dict):
    """Write a transaction as a graph edge: sender -> receiver."""
    session.run(
        "MERGE (s:Account {id: $sender}) SET s.flagged = coalesce(s.flagged, false)",
        sender=tx.get("user_id", "UNKNOWN"),
    )
    session.run(
        "MERGE (r:Account {id: $receiver}) SET r.flagged = coalesce(r.flagged, false)",
        receiver=tx.get("target_account", "UNKNOWN"),
    )
    session.run(
        """
        MATCH (s:Account {id: $sender})
        MATCH (r:Account {id: $receiver})
        MERGE (s)-[:SENT_TO {amount: $amount, tx_id: $tx_id}]->(r)
        """,
        sender=tx.get("user_id"),
        receiver=tx.get("target_account"),
        amount=tx.get("amount", 0),
        tx_id=tx.get("tx_id", "N/A"),
    )
    logger.info(
        "Ingested: %s ──(%.2f)──► %s",
        tx.get("user_id"), tx.get("amount", 0), tx.get("target_account")
    )


def run_consumer():
    """Main consumer loop. Requires Kafka and Neo4j to be running."""
    try:
        from confluent_kafka import Consumer
        from neo4j import GraphDatabase
    except ImportError as e:
        logger.error("Missing dependency: %s. Install with: pip install confluent-kafka neo4j", e)
        return

    logger.info("Starting Kafka consumer on %s, topic=%s", KAFKA_BROKER, KAFKA_TOPIC)

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    consumer = Consumer({
        "bootstrap.servers": KAFKA_BROKER,
        "group.id": "graph-ingestion",
        "auto.offset.reset": "earliest",
    })
    consumer.subscribe([KAFKA_TOPIC])

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                logger.error("Consumer error: %s", msg.error())
                continue

            tx = json.loads(msg.value().decode("utf-8"))
            with driver.session() as session:
                ingest_transaction(session, tx)

    except KeyboardInterrupt:
        logger.info("Consumer shutting down...")
    finally:
        consumer.close()
        driver.close()


if __name__ == "__main__":
    run_consumer()
