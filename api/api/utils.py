from datetime import datetime

from persistence.schema import Base


def serialize(obj: object):
    """Convert datetime objects to epoch timestamps recursively."""
    if isinstance(obj, datetime):
        return obj.timestamp()  # Convert to Unix timestamp
    elif isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize(i) for i in obj]
    elif isinstance(obj, Base):
        return serialize(obj.__dict__)
    return obj
