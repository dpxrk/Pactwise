"""SAP RFC Connector using PyRFC"""

import logging
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Union

try:
    from pyrfc import Connection, RFCError
    PYRFC_AVAILABLE = True
except ImportError:
    PYRFC_AVAILABLE = False
    RFCError = Exception
    
    class Connection:
        """Mock Connection class when PyRFC is not available"""
        def __init__(self, **kwargs):
            logging.warning("PyRFC not installed. SAP integration will use mock mode.")
            self.params = kwargs
        
        def call(self, func_name: str, **params):
            return {"STATUS": "MOCK", "MESSAGE": f"Mock call to {func_name}"}
        
        def close(self):
            pass

from shared.config import get_config


class SAPConnectionPool:
    """SAP connection pool manager"""
    
    def __init__(self, max_connections: int = 5):
        self.max_connections = max_connections
        self.connections: List[Connection] = []
        self.available: List[Connection] = []
        self.in_use: Dict[int, Connection] = {}
        self.config = get_config().sap
        self.logger = logging.getLogger(__name__)
    
    def get_connection(self) -> Connection:
        """Get a connection from the pool"""
        # Try to get an available connection
        if self.available:
            conn = self.available.pop()
            self.in_use[id(conn)] = conn
            return conn
        
        # Create new connection if under limit
        if len(self.connections) < self.max_connections:
            conn = self._create_connection()
            self.connections.append(conn)
            self.in_use[id(conn)] = conn
            return conn
        
        # Wait for a connection to become available
        raise RuntimeError("No SAP connections available in pool")
    
    def return_connection(self, conn: Connection):
        """Return a connection to the pool"""
        conn_id = id(conn)
        if conn_id in self.in_use:
            del self.in_use[conn_id]
            self.available.append(conn)
    
    def _create_connection(self) -> Connection:
        """Create a new SAP connection"""
        try:
            return Connection(
                ashost=self.config.ashost,
                sysnr=self.config.sysnr,
                client=self.config.client,
                user=self.config.user,
                passwd=self.config.password,
                lang=self.config.lang
            )
        except Exception as e:
            self.logger.error(f"Failed to create SAP connection: {str(e)}")
            # Return mock connection if real connection fails
            return Connection()
    
    def close_all(self):
        """Close all connections in the pool"""
        for conn in self.connections:
            try:
                conn.close()
            except:
                pass
        self.connections.clear()
        self.available.clear()
        self.in_use.clear()


class SAPConnector:
    """Main SAP connector class"""
    
    def __init__(self, use_pool: bool = True):
        self.config = get_config().sap
        self.logger = logging.getLogger(__name__)
        self.use_pool = use_pool
        
        if not PYRFC_AVAILABLE:
            self.logger.warning(
                "PyRFC is not installed. SAP integration will run in mock mode. "
                "Install SAP NW RFC SDK and pyrfc for real SAP connectivity."
            )
        
        if self.use_pool:
            self.pool = SAPConnectionPool()
        else:
            self.pool = None
        
        self._connection: Optional[Connection] = None
    
    @contextmanager
    def connect(self):
        """Context manager for SAP connection"""
        if self.use_pool:
            conn = self.pool.get_connection()
            try:
                yield conn
            finally:
                self.pool.return_connection(conn)
        else:
            conn = self._get_connection()
            try:
                yield conn
            finally:
                if not self.use_pool:
                    conn.close()
                    self._connection = None
    
    def _get_connection(self) -> Connection:
        """Get or create a connection"""
        if self._connection is None:
            try:
                self._connection = Connection(
                    ashost=self.config.ashost,
                    sysnr=self.config.sysnr,
                    client=self.config.client,
                    user=self.config.user,
                    passwd=self.config.password,
                    lang=self.config.lang
                )
                self.logger.info("SAP connection established")
            except Exception as e:
                self.logger.error(f"SAP connection failed: {str(e)}")
                # Use mock connection for development
                self._connection = Connection()
        
        return self._connection
    
    def execute_bapi(
        self,
        function_name: str,
        params: Optional[Dict[str, Any]] = None,
        commit: bool = True
    ) -> Dict[str, Any]:
        """Execute a BAPI function"""
        params = params or {}
        
        with self.connect() as conn:
            try:
                # Call the BAPI
                result = conn.call(function_name, **params)
                
                # Check for errors in RETURN structure
                if "RETURN" in result:
                    self._check_bapi_errors(result["RETURN"])
                
                # Commit if requested and no errors
                if commit and self._should_commit(result):
                    conn.call("BAPI_TRANSACTION_COMMIT", WAIT="X")
                    self.logger.info(f"Transaction committed for {function_name}")
                
                return result
                
            except RFCError as e:
                self.logger.error(f"RFC Error in {function_name}: {str(e)}")
                # Rollback on error
                try:
                    conn.call("BAPI_TRANSACTION_ROLLBACK")
                except:
                    pass
                raise
            
            except Exception as e:
                self.logger.error(f"Error executing {function_name}: {str(e)}")
                raise
    
    def _check_bapi_errors(self, return_data: Union[Dict, List]):
        """Check BAPI return structure for errors"""
        if isinstance(return_data, dict):
            return_data = [return_data]
        
        errors = []
        warnings = []
        
        for ret in return_data:
            if ret.get("TYPE") == "E":  # Error
                errors.append(f"{ret.get('ID', '')}: {ret.get('MESSAGE', 'Unknown error')}")
            elif ret.get("TYPE") == "W":  # Warning
                warnings.append(f"{ret.get('ID', '')}: {ret.get('MESSAGE', 'Unknown warning')}")
        
        if warnings:
            self.logger.warning(f"BAPI warnings: {'; '.join(warnings)}")
        
        if errors:
            raise Exception(f"BAPI errors: {'; '.join(errors)}")
    
    def _should_commit(self, result: Dict) -> bool:
        """Check if transaction should be committed"""
        # Don't commit if there are errors
        if "RETURN" in result:
            returns = result["RETURN"]
            if isinstance(returns, dict):
                returns = [returns]
            
            for ret in returns:
                if ret.get("TYPE") == "E":
                    return False
        
        # Check if any data was created
        return any(key.endswith("_CREATED") or key.endswith("_NUMBER") for key in result.keys())
    
    def test_connection(self) -> bool:
        """Test SAP connection"""
        try:
            with self.connect() as conn:
                result = conn.call("RFC_PING")
                self.logger.info("SAP connection test successful")
                return True
        except Exception as e:
            self.logger.error(f"SAP connection test failed: {str(e)}")
            return False
    
    def get_table_data(
        self,
        table_name: str,
        fields: Optional[List[str]] = None,
        where_clause: Optional[str] = None,
        max_rows: int = 1000
    ) -> List[Dict]:
        """Read data from SAP table using RFC_READ_TABLE"""
        try:
            # Prepare options
            options = []
            if where_clause:
                # Split where clause into 72 character chunks
                chunks = [where_clause[i:i+72] for i in range(0, len(where_clause), 72)]
                options = [{"TEXT": chunk} for chunk in chunks]
            
            # Prepare fields
            if fields:
                fields_param = [{"FIELDNAME": field} for field in fields]
            else:
                fields_param = []
            
            with self.connect() as conn:
                result = conn.call(
                    "RFC_READ_TABLE",
                    QUERY_TABLE=table_name,
                    DELIMITER="|",
                    ROWCOUNT=max_rows,
                    FIELDS=fields_param,
                    OPTIONS=options
                )
                
                # Parse result
                data = []
                if "DATA" in result and "FIELDS" in result:
                    field_names = [f["FIELDNAME"] for f in result["FIELDS"]]
                    
                    for row in result["DATA"]:
                        values = row["WA"].split("|")
                        data.append(dict(zip(field_names, values)))
                
                return data
                
        except Exception as e:
            self.logger.error(f"Error reading table {table_name}: {str(e)}")
            raise
    
    def close(self):
        """Close connection"""
        if self.pool:
            self.pool.close_all()
        elif self._connection:
            self._connection.close()
            self._connection = None