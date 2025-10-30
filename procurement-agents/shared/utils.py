"""Shared utility functions"""

import hashlib
import json
import re
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Any, Dict, List, Optional, Union


def generate_id(prefix: str = "") -> str:
    """Generate unique ID with optional prefix"""
    unique_id = str(uuid.uuid4())
    if prefix:
        return f"{prefix}-{unique_id}"
    return unique_id


def generate_document_number(doc_type: str, sequence: Optional[int] = None) -> str:
    """Generate document number with type and date"""
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    
    if sequence:
        return f"{doc_type}-{timestamp}-{sequence:05d}"
    
    unique_suffix = str(uuid.uuid4())[:8].upper()
    return f"{doc_type}-{timestamp}-{unique_suffix}"


def format_currency(
    amount: Union[float, Decimal],
    currency: str = "USD",
    locale_format: bool = True
) -> str:
    """Format amount as currency string"""
    if isinstance(amount, float):
        amount = Decimal(str(amount))
    
    if locale_format:
        # Format with thousand separators
        formatted = f"{amount:,.2f}"
    else:
        formatted = f"{amount:.2f}"
    
    currency_symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "JPY": "¥",
        "CNY": "¥"
    }
    
    symbol = currency_symbols.get(currency, currency + " ")
    return f"{symbol}{formatted}"


def parse_currency(currency_string: str) -> Decimal:
    """Parse currency string to Decimal"""
    # Remove currency symbols and whitespace
    cleaned = re.sub(r'[^\d.-]', '', currency_string)
    return Decimal(cleaned)


def format_date(
    date_obj: Union[datetime, date, str],
    format_string: str = "%Y-%m-%d"
) -> str:
    """Format date to string"""
    if isinstance(date_obj, str):
        date_obj = parse_date(date_obj)
    
    if isinstance(date_obj, datetime):
        return date_obj.strftime(format_string)
    elif isinstance(date_obj, date):
        return date_obj.strftime(format_string)
    
    return str(date_obj)


def parse_date(date_string: str) -> datetime:
    """Parse date string to datetime object"""
    # Try common date formats
    formats = [
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%m-%d-%Y"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue
    
    # Try ISO format
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except:
        pass
    
    raise ValueError(f"Unable to parse date: {date_string}")


def calculate_percentage(value: float, total: float) -> float:
    """Calculate percentage safely"""
    if total == 0:
        return 0.0
    return (value / total) * 100


def round_decimal(value: Union[float, Decimal], places: int = 2) -> Decimal:
    """Round decimal to specified places"""
    if isinstance(value, float):
        value = Decimal(str(value))
    
    quantize_value = Decimal(10) ** -places
    return value.quantize(quantize_value)


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove path components
    filename = filename.replace('/', '').replace('\\', '')
    
    # Remove special characters
    filename = re.sub(r'[<>:"|?*]', '', filename)
    
    # Replace spaces with underscores
    filename = filename.replace(' ', '_')
    
    # Limit length
    name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
    if len(name) > 100:
        name = name[:100]
    
    return f"{name}.{ext}" if ext else name


def generate_hash(data: Union[str, bytes, Dict]) -> str:
    """Generate SHA256 hash of data"""
    if isinstance(data, dict):
        data = json.dumps(data, sort_keys=True)
    
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    return hashlib.sha256(data).hexdigest()


def validate_email(email: str) -> bool:
    """Validate email address format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    # Remove non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Check if it's a valid length (10-15 digits)
    return 10 <= len(digits) <= 15


def chunk_list(lst: List, chunk_size: int) -> List[List]:
    """Split list into chunks"""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def flatten_dict(nested_dict: Dict, parent_key: str = '', sep: str = '.') -> Dict:
    """Flatten nested dictionary"""
    items = []
    
    for k, v in nested_dict.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    
    return dict(items)


def deep_merge(dict1: Dict, dict2: Dict) -> Dict:
    """Deep merge two dictionaries"""
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    
    return result


def calculate_business_days(start_date: datetime, end_date: datetime) -> int:
    """Calculate business days between two dates"""
    from datetime import timedelta
    
    days = 0
    current = start_date
    
    while current <= end_date:
        if current.weekday() < 5:  # Monday = 0, Friday = 4
            days += 1
        current += timedelta(days=1)
    
    return days


def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    
    return f"{size_bytes:.2f} PB"


def extract_numbers(text: str) -> List[float]:
    """Extract all numbers from text"""
    pattern = r'[-+]?\d*\.?\d+'
    matches = re.findall(pattern, text)
    return [float(m) for m in matches]


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """Truncate text to maximum length"""
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text"""
    return ' '.join(text.split())


def remove_duplicates(lst: List, key_func: Optional[callable] = None) -> List:
    """Remove duplicates from list while preserving order"""
    if key_func:
        seen = set()
        result = []
        for item in lst:
            key = key_func(item)
            if key not in seen:
                seen.add(key)
                result.append(item)
        return result
    else:
        # For hashable items
        seen = set()
        return [x for x in lst if not (x in seen or seen.add(x))]


def retry_with_backoff(
    func: callable,
    max_retries: int = 3,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """Decorator for retrying function with exponential backoff"""
    import time
    from functools import wraps
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        retry_count = 0
        delay = 1
        
        while retry_count < max_retries:
            try:
                return func(*args, **kwargs)
            except exceptions as e:
                retry_count += 1
                if retry_count >= max_retries:
                    raise
                
                time.sleep(delay)
                delay *= backoff_factor
        
        return None
    
    return wrapper


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers"""
    if denominator == 0:
        return default
    return numerator / denominator


def mask_sensitive_data(data: str, mask_char: str = "*", visible_chars: int = 4) -> str:
    """Mask sensitive data leaving only last few characters visible"""
    if len(data) <= visible_chars:
        return mask_char * len(data)
    
    return mask_char * (len(data) - visible_chars) + data[-visible_chars:]


def generate_random_string(length: int = 10, include_digits: bool = True) -> str:
    """Generate random alphanumeric string"""
    import random
    import string
    
    chars = string.ascii_letters
    if include_digits:
        chars += string.digits
    
    return ''.join(random.choice(chars) for _ in range(length))


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for special types"""
    
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, uuid.UUID):
            return str(obj)
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        
        return super().default(obj)


def to_json(data: Any, pretty: bool = False) -> str:
    """Convert data to JSON string"""
    if pretty:
        return json.dumps(data, cls=JSONEncoder, indent=2, sort_keys=True)
    return json.dumps(data, cls=JSONEncoder)


def from_json(json_string: str) -> Any:
    """Parse JSON string"""
    return json.loads(json_string)