"""add embed settings table

Revision ID: 9e1f4a3f2a6b
Revises: 8cdffe164ead
Create Date: 2025-12-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9e1f4a3f2a6b'
down_revision = '8cdffe164ead'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'embed_settings',
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id'), primary_key=True),
        sa.Column('domains', postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('theme', sa.String(), nullable=False, server_default='ocean'),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

def downgrade() -> None:
    op.drop_table('embed_settings')
