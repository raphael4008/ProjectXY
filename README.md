# Cyber Intelligence Platform (ProjectXY)

**A Next-Generation Threat Analysis & Correlation Engine.**

> "Magical strength in scripts, future-proof in design."

## 🚀 Overview
ProjectXY is a comprehensive Cyber Intelligence Platform designed to ingest, correlate, and analyze threat data using a hybrid Relational-Graph architecture. It combines the structured rigor of SQL with the connective power of Graph Databases (Neo4j) to uncover hidden relationships between Threat Actors, Malware, and Infrastructure.

## 🏗 Architecture
The system is built on a modern, containerized stack:

- **Frontend**: Next.js 14, Tailwind CSS, Force Graph 2D (React).
- **Backend**: FastAPI (Python), SQLAlchemy, Pydantic.
- **Databases**:
    - **PostgreSQL**: Source of truth for Entities and Audit Logs.
    - **Neo4j**: Graph engine for traversing threat neighborhoods.
- **AI Layer**: Anti-Hallucination Guardrails, Logic Units (Mocked/Ready for LLM).

## ✨ The "Magic" Script
We believe in zero-friction deployment. The entire system can be ignited with a single command:

```bash
./magic.sh
```

This script will:
1.  🐳 **Launch** the entire Docker stack.
2.  ⏳ **Wait** for database health checks.
3.  🔮 **Auto-Migrate** the database schema.
4.  🌱 **Seed "Genesis" Data**: Populates the world with complex threat scenarios (Voltaic Typhoon, Ryuk Ransomware, etc.).
5.  🔍 **Verify** the deployment with smoke tests.

## 🛠 Manual Setup
If you prefer manual control:
1.  `docker-compose up -d --build`
2.  `docker-compose exec backend alembic upgrade head`
3.  `docker-compose exec backend python seed.py`

## 🧠 Live AI Log Streaming
To see the "AI Thinking Process" in real-time, you can stream the backend logs directly to your terminal:

```bash
docker-compose logs -f backend
```

## 🔑 Key Features
- **Dynamic Risk Scoring**: Entities are scored based on their attributes and graph connections.
- **Graph Visualization**: Interactive force-directed graph (Frontend) showing threat neighborhoods.
- **AI Summaries**: Intelligent narratives generated for each entity.
- **Strict Typing**: Full Pydantic/TypeScript validation across the stack.

## 📚 Documentation
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Neo4j Browser**: [http://localhost:7474](http://localhost:7474)

## 🛡 Security
- **JWT Authentication**: OAuth2 compliant token flow.
- **Audit Logging**: Every action is immutably recorded in PostgreSQL.

---
*Built for the long run. Designed for the future.*
