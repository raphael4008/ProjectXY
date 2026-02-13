import logging
from app.db.session import SessionLocal
from app.db.models import User
from app.core.security import get_password_hash
from app.db.genesis import sow_chaos

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    db = SessionLocal()
    
    # Check if admin exists
    user = db.query(User).filter(User.email == "admin@projectxy.com").first()
    if not user:
        admin_user = User(
            email="admin@projectxy.com",
            hashed_password=get_password_hash("admin123"), # Change in production
            full_name="System Administrator",
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        logger.info("Admin user created: admin@projectxy.com / admin123")
    else:
        logger.info("Admin user already exists.")
        
    sow_chaos(db)
    db.close()

if __name__ == "__main__":
    logger.info("Creating initial data...")
    init_db()
    logger.info("Initial data created.")
