"""add admin users table

Revision ID: 4f2a1d9c7b21
Revises: 8cdffe164ead
Create Date: 2025-12-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '4f2a1d9c7b21'
down_revision = '9e1f4a3f2a6b'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'admin_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('role', sa.String(), nullable=False, server_default='admin'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

def downgrade() -> None:
    op.drop_table('admin_users')
