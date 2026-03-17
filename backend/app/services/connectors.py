
import random
from typing import List, Dict, Any

class ConnectorService:
    """
    Global Connector: Fetches data from external/public sources (OSINT).
    Simulates fetching from sources like Shodan, VirusTotal, etc.
    """
    def __init__(self):
        self.sources = ["OSINT_FEED_A", "THREAT_EXCHANGE", "PUBLIC_DB_LEAKS"]

    async def search_public_intel(self, query: str) -> List[Dict[str, Any]]:
        """
        Mock: Search public databases for a given query (IP, Hash, Domain).
        """
        # Simulate network latency
        # await asyncio.sleep(0.5) 
        
        results = []
        
        # Mock Shodan-style results for IPs
        if str(query).replace('.','').isnumeric():
             results.append({
                 "source": "Shodan (Mock)",
                 "type": "infrastructure",
                 "data": {
                     "ip": query,
                     "ports": [80, 443, 8080],
                     "vulns": ["CVE-2023-1234"],
                     "isp": "MockISP Corp"
                 }
             })
        
        # Mock VirusTotal-style results for Hashes
        elif len(query) > 30:
             results.append({
                 "source": "VirusTotal (Mock)",
                 "type": "file_hash",
                 "data": {
                     "hash": query,
                     "positives": random.randint(0, 70),
                     "total": 70,
                     "malicious": True if random.random() > 0.5 else False
                 }
             })
             
        else:
             results.append({
                 "source": "DarkWeb Monitor (Mock)",
                 "type": "mention",
                 "data": {
                     "query": query,
                     "hits": random.randint(0, 5),
                     "last_seen": "2024-02-15"
                 }
             })

        return results

connector_service = ConnectorService()
