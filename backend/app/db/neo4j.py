from neo4j import AsyncGraphDatabase, AsyncDriver
from app.core.config import settings
from contextlib import asynccontextmanager

class Neo4j:
    _driver: AsyncDriver = None

    async def connect(self):
        """
        Establishes the connection to the Neo4j database.
        """
        if not self._driver:
            print("Connecting to Neo4j database...")
            try:
                self._driver = AsyncGraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
                )
                await self._driver.verify_connectivity()
                print("✅ Neo4j connection established.")
            except Exception as e:
                print(f"❌ Failed to connect to Neo4j: {e}")
                raise

    async def close(self):
        """
        Closes the connection to the Neo4j database.
        """
        if self._driver:
            print("Closing Neo4j connection...")
            await self._driver.close()
            self._driver = None
            print("✅ Neo4j connection closed.")

    @asynccontextmanager
    async def get_session(self):
        """
        Provides a Neo4j session for database operations.
        Usage:
            async with neo4j.get_session() as session:
                await session.run(...)
        """
        if not self._driver:
            await self.connect()
        
        session = None
        try:
            session = self._driver.get_multi_db_session(database='neo4j')
            yield session
        finally:
            if session:
                await session.close()

# Global instance
neo4j_graph = Neo4j()

# The following functions can be used for dependency injection in FastAPI
async def get_neo4j_session():
    """FastAPI dependency to get a Neo4j session."""
    async with neo4j_graph.get_session() as session:
        yield session

# It's also good practice to manage the driver lifecycle with the app lifespan
async def connect_to_neo4j():
    await neo4j_graph.connect()

async def close_neo4j_connection():
    await neo4j_graph.close()
