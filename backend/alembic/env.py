from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
import sys
import os

# Add the project root to the path so we can import 'app'
sys.path.append(os.getcwd())
sys.path.append("/app") # Explicitly add /app just in case
print(f"DEBUG: CWD={os.getcwd()}")
print(f"DEBUG: sys.path={sys.path}")
print(f"DEBUG: listing current dir: {os.listdir(os.getcwd())}")

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from app.models.models import Base
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.



# Import settings from app config
from app.core.config import settings

def get_url():
    # Alembic requires a synchronous driver.
    # The app settings might be using asyncpg.
    # We replace +asyncpg with empty string or +psycopg2 if needed.
    # Assuming default is psycopg2 compatible if we just remove +asyncpg.
    return settings.SQLALCHEMY_DATABASE_URI.replace("+asyncpg", "")

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Create configuration object from alembic.ini
    configuration = config.get_section(config.config_ini_section, {})
    # Override sqlalchemy.url with our calculated URL
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
