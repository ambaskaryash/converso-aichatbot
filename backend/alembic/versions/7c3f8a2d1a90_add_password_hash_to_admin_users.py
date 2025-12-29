"""add password hash to admin users

Revision ID: 7c3f8a2d1a90
Revises: 4f2a1d9c7b21
Create Date: 2025-12-29
"""
from alembic import op
import sqlalchemy as sa

revision = '7c3f8a2d1a90'
down_revision = '4f2a1d9c7b21'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('admin_users', sa.Column('password_hash', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('admin_users', 'password_hash')
