"""add feedback and welcome

Revision ID: a1b2c3d4e5f6
Revises: 0b2c6f74d8a4
Create Date: 2025-12-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '0b2c6f74d8a4'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('projects', sa.Column('welcome_message', sa.Text(), nullable=True))
    op.add_column('chat_messages', sa.Column('feedback_score', sa.Integer(), nullable=True))

def downgrade() -> None:
    op.drop_column('chat_messages', 'feedback_score')
    op.drop_column('projects', 'welcome_message')
