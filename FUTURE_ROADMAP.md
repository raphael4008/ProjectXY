# 🔮 Future Roadmap: ProjectXY

> "To serve for the long run."

This document outlines the strategic vision for evolving ProjectXY from a powerful prototype into an enterprise-grade Cyber Intelligence ecosystem.

## Phase 1: Advanced AI Integration (The "Brain")
- [ ] **Local LLM Inference**: Replace mock AI summaries with local Llama 3 or Mistral models via Ollama.
- [ ] **RAG (Retrieval Augmented Generation)**: Index Audit Logs and Entity descriptions in a Vector Database (e.g., pgvector or Neo4j Vector Index) for "Chat with Data" capabilities.
- [ ] **Automated Triage**: AI agents that automatically classify and assign risk scores to new raw intel.

## Phase 2: Data Ingestion Fabric (The "Senses")
- [ ] **STIX/TAXII Connectors**: Native support for standard threat intelligence feeds.
- [ ] **Syslog/SIEM Integration**: Real-time ingestion of logs from Splunk or Elastic.
- [ ] **Web Scrapers**: Autonomous agents to scrape dark web leak sites (using Headless Browser tools).

## Phase 3: Enterprise Hardening (The "Shield")
- [ ] **Kubernetes (K8s)**: Helm charts for scalable deployment on EKS/GKE.
- [ ] **SSO/OIDC**: Integration with Okta/Azure AD for enterprise auth.
- [ ] **Role-Based Access Control (RBAC) Fine-Tuning**: Granular permissions (e.g., "View Only", "Analyst", "Admin").

## Phase 4: Graph Analytics (The "Insight")
- [ ] **Pathfinding Algorithms**: "Shortest Path to Crown Jewels" analysis.
- [ ] **Community Detection**: Louvain algorithms to find hidden threat clusters.
- [ ] **Time-Travel**: Visualizing graph evolution over time.

## Developer Experience
- **SDK**: A Python/Go SDK for 3rd party integration.
- **Plugin System**: Allow community developers to write "Analyzers" as simple Python functions.

---
**Status**: Planning
**Maintainer**: Team Antigravity
