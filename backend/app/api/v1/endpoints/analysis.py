from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.db import models
from app.db.models import EntityDB
from app.services.analysis.risk import RiskEngine
from app.services.analysis.summarizer import summarizer
# from app.db.graph import graph_db # Commented out until Neo4j is confirmed running in dev

router = APIRouter()
risk_engine = RiskEngine()

@router.get("/risk/{entity_id}", response_model=dict)
def analyze_risk(
    entity_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Run Real-time Risk Analysis.
    """
    entity = db.query(EntityDB).filter(EntityDB.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Needs full Entity schema adaptation, doing simplified conversion here
    # In prod, use a proper adapter (ORM -> Pydantic)
    # Mocking relationships for now
    relationships = [] 
    
    # We need to construct a Pydantic Entity from the DB Entity to pass to the engine
    # This is a bit hacky for the wiring phase but ensures type safety
    from app.schemas.entity import Entity as EntitySchema
    from app.schemas.entity import Attribute as AttributeSchema, AttributeType, EntityType
    
    # Attributes conversion
    attrs = []
    for a in entity.attributes:
        attrs.append(AttributeSchema(
            value=a.value, 
            type=AttributeType(a.type),
            confidence=a.confidence or 0.5
        ))
        
    entity_schema = EntitySchema(
        id=str(entity.id),
        canonical_name=entity.canonical_name,
        type=EntityType(entity.type),
        risk_score=entity.risk_score,
        attributes=attrs,
        created_at=entity.created_at,
        updated_at=entity.updated_at
    )

    result = risk_engine.analyze(entity_schema, relationships)
    return result.dict()

@router.get("/graph/neighborhood/{entity_id}")
async def get_graph_neighborhood(
    entity_id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Fetch graph neighborhood for visualization.
    """
    # Real Neo4j Query
    # MATCH 1-hop neighborhood
    query = """
    MATCH (n:Entity {id: $id})-[r]-(m:Entity)
    RETURN n, r, m
    LIMIT 50
    """
    
    # We need a driver instance. 
    # In a real app, this should be a dependency injection or global singleton from app.db.graph
    from neo4j import GraphDatabase
    from app.core.config import settings
    
    driver = GraphDatabase.driver(
        settings.NEO4J_URI, 
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
    )
    
    nodes = {}
    links = []
    
    try:
        with driver.session() as session:
            result = session.run(query, id=entity_id)
            for record in result:
                n = record["n"]
                m = record["m"]
                r = record["r"]
                
                # Add Source Node
                if n["id"] not in nodes:
                    nodes[n["id"]] = {
                        "id": n["id"], 
                        "name": n.get("name"), 
                        "group": n.get("group", 1),
                        "val": n.get("risk", 10) / 5 # Size by risk
                    }
                
                # Add Target Node
                if m["id"] not in nodes:
                    nodes[m["id"]] = {
                        "id": m["id"], 
                        "name": m.get("name"), 
                        "group": 2, # Neighbor
                        "val": m.get("risk", 10) / 5
                    }
                
                # Add Link
                links.append({
                    "source": n["id"],
                    "target": m["id"],
                    "type": r.type
                })
                
        # If no neighbors found, at least return the node itself
        if entity_id not in nodes:
             # Fallback fetch just the node logic or return empty
             pass

    except Exception as e:
        print(f"Neo4j Error: {e}")
    finally:
        driver.close()

    return {
        "nodes": list(nodes.values()),
        "links": links
    }

@router.get("/ai/summary/{entity_id}")
async def get_ai_summary(
    entity_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Generate AI Intelligence Summary.
    """
    entity = db.query(EntityDB).filter(EntityDB.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
        
    # Same Entity Schema reconstruction as above (Should extract to utility)
    # ... skipping for brevity, using mock string for now
    from app.schemas.entity import Entity as EntitySchema, EntityType
    entity_schema = EntitySchema(
         id=str(entity.id),
        canonical_name=entity.canonical_name,
        type=EntityType(entity.type),
        risk_score=entity.risk_score,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        attributes=[] # Empty for now
    )
    
    summary = await summarizer.generate_summary(entity_schema, evidence=[])
    return {"summary": summary}
