"""Common utility functions used across the procurement system"""

import hashlib
import uuid
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import re
import json
from decimal import Decimal
from enum import Enum


def generate_id(prefix: str = "", length: int = 8) -> str:
    """
    Generate a unique ID with optional prefix
    
    Args:
        prefix: Optional prefix for the ID
        length: Length of the random part (default 8)
    
    Returns:
        Generated ID string
    """
    random_part = uuid.uuid4().hex[:length]
    return f"{prefix}-{random_part}" if prefix else random_part


def calculate_hash(data: Union[str, dict, list]) -> str:
    """
    Calculate SHA256 hash of data
    
    Args:
        data: Data to hash (string, dict, or list)
    
    Returns:
        Hex digest of the hash
    """
    if isinstance(data, (dict, list)):
        data = json.dumps(data, sort_keys=True, default=str)
    elif not isinstance(data, str):
        data = str(data)
    
    return hashlib.sha256(data.encode()).hexdigest()


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal attacks
    
    Args:
        filename: Original filename
    
    Returns:
        Sanitized filename
    """
    # Remove path separators and special characters
    filename = re.sub(r'[^\w\s\-\.]', '', filename)
    # Remove leading dots
    filename = filename.lstrip('.')
    # Limit length
    max_length = 255
    if len(filename) > max_length:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = f"{name[:max_length-len(ext)-1]}.{ext}" if ext else name[:max_length]
    
    return filename or 'unnamed'


def format_currency(amount: float, currency: str = "USD", locale: str = "en_US") -> str:
    """
    Format amount as currency string
    
    Args:
        amount: Monetary amount
        currency: Currency code (default USD)
        locale: Locale for formatting
    
    Returns:
        Formatted currency string
    """
    # Simple implementation - can be enhanced with babel library
    symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "JPY": "¥",
        "INR": "₹"
    }
    
    symbol = symbols.get(currency, currency + " ")
    
    # Format with thousand separators
    if locale == "en_US":
        formatted = f"{amount:,.2f}"
    else:
        formatted = f"{amount:.2f}"
    
    return f"{symbol}{formatted}"


def parse_date(date_string: str) -> Optional[datetime]:
    """
    Parse date string in various formats
    
    Args:
        date_string: Date string to parse
    
    Returns:
        datetime object or None if parsing fails
    """
    if not date_string:
        return None
    
    # Common date formats
    formats = [
        "%Y-%m-%d",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%m-%d-%Y"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue
    
    return None


def calculate_business_days(start_date: datetime, end_date: datetime) -> int:
    """
    Calculate number of business days between two dates
    
    Args:
        start_date: Start date
        end_date: End date
    
    Returns:
        Number of business days
    """
    if start_date > end_date:
        start_date, end_date = end_date, start_date
    
    business_days = 0
    current = start_date
    
    while current <= end_date:
        if current.weekday() < 5:  # Monday = 0, Friday = 4
            business_days += 1
        current += timedelta(days=1)
    
    return business_days


def validate_email(email: str) -> bool:
    """
    Validate email address format
    
    Args:
        email: Email address to validate
    
    Returns:
        True if valid, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format
    
    Args:
        phone: Phone number to validate
    
    Returns:
        True if valid, False otherwise
    """
    # Remove common separators
    cleaned = re.sub(r'[\s\-\(\)\+\.]', '', phone)
    # Check if it's all digits and reasonable length
    return cleaned.isdigit() and 7 <= len(cleaned) <= 15


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate text to maximum length
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add when truncated
    
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def merge_dicts(*dicts: dict) -> dict:
    """
    Deep merge multiple dictionaries
    
    Args:
        *dicts: Dictionaries to merge
    
    Returns:
        Merged dictionary
    """
    result = {}
    
    for dictionary in dicts:
        for key, value in dictionary.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = merge_dicts(result[key], value)
            else:
                result[key] = value
    
    return result


def batch_list(items: list, batch_size: int) -> List[list]:
    """
    Split list into batches
    
    Args:
        items: List to split
        batch_size: Size of each batch
    
    Returns:
        List of batches
    """
    return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]


def flatten_dict(d: dict, parent_key: str = '', sep: str = '.') -> dict:
    """
    Flatten nested dictionary
    
    Args:
        d: Dictionary to flatten
        parent_key: Parent key for recursion
        sep: Separator for keys
    
    Returns:
        Flattened dictionary
    """
    items = []
    
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    
    return dict(items)


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Safely divide two numbers
    
    Args:
        numerator: Numerator
        denominator: Denominator
        default: Default value if division by zero
    
    Returns:
        Division result or default
    """
    if denominator == 0:
        return default
    return numerator / denominator


def calculate_percentage(value: float, total: float, decimals: int = 2) -> float:
    """
    Calculate percentage
    
    Args:
        value: Value
        total: Total
        decimals: Number of decimal places
    
    Returns:
        Percentage
    """
    if total == 0:
        return 0.0
    
    percentage = (value / total) * 100
    return round(percentage, decimals)


def is_valid_uuid(uuid_string: str) -> bool:
    """
    Check if string is a valid UUID
    
    Args:
        uuid_string: String to check
    
    Returns:
        True if valid UUID, False otherwise
    """
    try:
        uuid.UUID(uuid_string)
        return True
    except (ValueError, AttributeError):
        return False


def extract_numbers(text: str) -> List[float]:
    """
    Extract all numbers from text
    
    Args:
        text: Text to extract numbers from
    
    Returns:
        List of numbers found
    """
    # Pattern to match integers and decimals
    pattern = r'-?\d+\.?\d*'
    matches = re.findall(pattern, text)
    
    numbers = []
    for match in matches:
        try:
            if '.' in match:
                numbers.append(float(match))
            else:
                numbers.append(float(match))
        except ValueError:
            continue
    
    return numbers


def normalize_string(text: str) -> str:
    """
    Normalize string for comparison (lowercase, trim, remove extra spaces)
    
    Args:
        text: Text to normalize
    
    Returns:
        Normalized text
    """
    # Convert to lowercase
    text = text.lower()
    # Remove leading/trailing whitespace
    text = text.strip()
    # Replace multiple spaces with single space
    text = re.sub(r'\s+', ' ', text)
    
    return text


class JsonEncoder(json.JSONEncoder):
    """Custom JSON encoder for special types"""
    
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, Enum):
            return obj.value
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        
        return super().default(obj)


def to_json(obj: Any, indent: int = None) -> str:
    """
    Convert object to JSON string
    
    Args:
        obj: Object to convert
        indent: Indentation for pretty printing
    
    Returns:
        JSON string
    """
    return json.dumps(obj, cls=JsonEncoder, indent=indent)


def from_json(json_string: str) -> Any:
    """
    Parse JSON string
    
    Args:
        json_string: JSON string to parse
    
    Returns:
        Parsed object
    """
    return json.loads(json_string)


def get_file_extension(filename: str) -> str:
    """
    Get file extension from filename
    
    Args:
        filename: Filename
    
    Returns:
        File extension (without dot) or empty string
    """
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''


def is_valid_file_type(filename: str, allowed_types: List[str]) -> bool:
    """
    Check if file type is allowed
    
    Args:
        filename: Filename to check
        allowed_types: List of allowed extensions
    
    Returns:
        True if allowed, False otherwise
    """
    extension = get_file_extension(filename)
    return extension in [t.lower().lstrip('.') for t in allowed_types]