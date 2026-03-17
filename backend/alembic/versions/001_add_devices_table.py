"""add_devices_table

Revision ID: 001_add_devices
Revises: 
Create Date: 2026-02-15 08:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_add_devices'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'devices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('accuracy_radius', sa.Float(), nullable=True),
        sa.Column('last_seen', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index(op.f('ix_devices_name'), 'devices', ['name'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_devices_name'), table_name='devices')
    op.drop_table('devices')
