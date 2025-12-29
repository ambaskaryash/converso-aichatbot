"""Add vector extension

Revision ID: bb63c1d8a983
Revises: 07894c6d0e04
Create Date: 2025-12-29 11:00:08.471158

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'bb63c1d8a983'
down_revision: Union[str, Sequence[str], None] = '07894c6d0e04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(text('DROP EXTENSION IF EXISTS vector'))
