from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import declared_attr
from datetime import datetime

class Base:
    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower()
    
    # Common fields
    # id will be defined in child classes to allow UUID or Integer
    
Base = declarative_base(cls=Base)
