from datetime import datetime

from persistence.schema import Base


def get_api_safe_json(obj: object):
    if isinstance(obj, datetime):
        return obj.timestamp()  # Convert to Unix timestamp
    elif isinstance(obj, dict):
        return {k: get_api_safe_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [get_api_safe_json(i) for i in obj]
    elif isinstance(obj, Base):
        return get_api_safe_json(obj.__dict__)
    return obj
