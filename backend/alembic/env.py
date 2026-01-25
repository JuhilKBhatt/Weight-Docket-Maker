# alembic/env.py
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# -----------------------------------------------------------
# 1. Add your project path so Alembic can find 'app'
# -----------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# -----------------------------------------------------------
# 2. Import your Database Base and Models
# -----------------------------------------------------------
from app.database import Base, DATABASE_URL
# Must import ALL models so Base.metadata can find them
from app.models import invoiceModels, docketModels, settingsModels

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# -----------------------------------------------------------
# 3. Set target metadata
# -----------------------------------------------------------
target_metadata = Base.metadata

# -----------------------------------------------------------
# 4. Overwrite sqlalchemy.url with your app's DATABASE_URL
# -----------------------------------------------------------
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
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