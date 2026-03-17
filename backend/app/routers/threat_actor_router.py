from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.infrastructure.graph import graph_db
from app.api.deps import get_current_user

router = APIRouter(prefix="/threat-actors", tags=["Threat Actors"])

def neo4j_to_force_graph(records: List[Dict[str, Any]]):
    """
    Converts a Neo4j graph query result into a format
    compatible with react-force-graph.
    """
    nodes = {}
    links = []

    for record in records:
        # Process nodes
        for key, value in record.items():
            if hasattr(value, 'id'): # It's a node
                node_id = str(value.id)
                if node_id not in nodes:
                    nodes[node_id] = {
                        "id": value.element_id,
                        "label": list(value.labels)[0],
                        **value
                    }
            elif hasattr(value, 'nodes'): # It's a relationship
                source_id = str(value.start_node.id)
                target_id = str(value.end_node.id)
                links.append({
                    "source": value.start_node.element_id,
                    "target": value.end_node.element_id,
                    "type": value.type
                })

    return {"nodes": list(nodes.values()), "links": links}


@router.get("/{fingerprint}/graph")
async def get_threat_actor_graph(
    fingerprint: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieves the graph of aliases and connections for a given ThreatActor fingerprint.
    """
    if not fingerprint:
        raise HTTPException(status_code=400, detail="Fingerprint is required.")

    query = """
    MATCH (ta:ThreatActor {fingerprint: $fingerprint})-[r]-(n)
    RETURN ta, r, n
    """
    
    records = await graph_db.execute_query(query, {"fingerprint": fingerprint})
    
    if not records:
        # If no relationships, just return the actor node
        actor_record = await graph_db.execute_query(
            "MATCH (ta:ThreatActor {fingerprint: $fingerprint}) RETURN ta",
            {"fingerprint": fingerprint}
        )
        if not actor_record:
            raise HTTPException(status_code=404, detail="ThreatActor not found.")
        return neo4j_to_force_graph(actor_record)


    return neo4j_to_force_graph(records)
