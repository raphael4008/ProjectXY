from neo4j import AsyncGraphDatabase
from app.core.config import settings

class GraphDatabase:
    def __init__(self):
        self.driver = None

    async def connect(self):
        self.driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )

    async def close(self):
        if self.driver:
            await self.driver.close()

    async def execute_query(self, query: str, params: dict = None):
        if not self.driver:
            await self.connect()
        
        async with self.driver.session() as session:
            result = await session.run(query, params or {})
            return [record.data() async for record in result]

# Global instance
graph_db = GraphDatabase()
