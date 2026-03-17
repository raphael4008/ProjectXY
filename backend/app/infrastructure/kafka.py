import json
from aiokafka import AIOKafkaProducer
import asyncio
import os

class KafkaStreamer:
    """
    Tier 1 / Tier 2 infrastructure: High-throughput event streaming.
    Handles the ingestion of millions of events per second from the Labyrinth 
    and distributes them to the AI Swarms and Omni-Graph.
    """
    def __init__(self):
        self.producer: AIOKafkaProducer = None
        self.bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

    async def connect(self):
        print(f"[KAFKA] Initializing connection to broker at {self.bootstrap_servers}...")
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            await self.producer.start()
            print("[KAFKA] Producer connected and ready to transmit.")
        except Exception as e:
            print(f"[KAFKA] Connection failed: {e}. Running in degraded mode (Graph only).")
            self.producer = None

    async def disconnect(self):
        if self.producer:
            await self.producer.stop()
            print("[KAFKA] Producer stopped cleanly.")

    async def emit_event(self, topic: str, event_data: dict):
        """
        Pushes a validated event into the stream for async processing by Swarms.
        """
        if not self.producer:
            # Silently degrade if Kafka isn't fully up during dev
            return
            
        try:
            await self.producer.send_and_wait(topic, event_data)
        except Exception as e:
            print(f"[KAFKA] Failed to emit event to {topic}: {e}")

# Global singleton
kafka_streamer = KafkaStreamer()
