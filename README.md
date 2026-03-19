# 🛡️ ProjectXY - Sovereign Intelligence Command Center

> **Status**: ✅ PRODUCTION READY | **Version**: 2.3 | **Last Updated**: March 18, 2026

ProjectXY is a **world-class cyber intelligence platform** designed for organizations that need complete dominance over their operational landscape. It combines:

- 🔍 **Advanced Threat Intelligence** (Neural De-Masking, OSINT)
- 🎯 **Red/Blue Team Orchestration** (Automated attack/defense)
- 🧠 **Agentic AI** (Autonomous threat hunting)
- 🔐 **Emergency Security** (SYSTEM_LOCKDOWN capability)
- 📊 **Complete Visibility** (Real-time execution streaming)
- 🛡️ **Immutable Audit Trail** (PostgreSQL ledger)

---

## 🚀 Quick Start

### Automated Setup (Recommended)
```bash
chmod +x QUICK_START.sh
./QUICK_START.sh
```

### Manual Setup
```bash
# Backend
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend && npm install && npm run dev

# Services (new terminal)
docker-compose up -d postgres redis
```

### Access
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:8000
- 📚 **Docs**: http://localhost:8000/api/v1/docs

---

## 📚 Documentation

### Essential Reading
1. **[Phase 2-3 Completion Summary](PHASE_2_3_COMPLETION_SUMMARY.md)** - What was built (recommended first read)
2. **[Complete System Integration](COMPLETE_SYSTEM_INTEGRATION.md)** - Full architecture & components
3. **[API Usage Guide](API_USAGE_GUIDE.md)** - 600+ lines of API examples

### Tools & Validation
4. **[Quick Start Script](QUICK_START.sh)** - Automated setup
5. **[Validation Checklist](VALIDATION_CHECKLIST.sh)** - 80+ automated tests
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
