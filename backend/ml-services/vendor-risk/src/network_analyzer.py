"""
Vendor network dependency and relationship analysis.
"""

import logging
from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass
import numpy as np
from collections import defaultdict, deque
from datetime import datetime

try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False
    logging.warning("NetworkX not available")

try:
    import igraph as ig
    IGRAPH_AVAILABLE = True
except ImportError:
    IGRAPH_AVAILABLE = False
    logging.warning("igraph not available")

logger = logging.getLogger(__name__)


@dataclass
class NetworkRisk:
    """Network-based risk assessment."""
    risk_type: str  # cascade, concentration, isolation, bottleneck
    severity: str  # critical, high, medium, low
    affected_vendors: List[str]
    impact_radius: int
    mitigation_strategies: List[str]
    confidence: float


class VendorNetworkAnalyzer:
    """
    Analyze vendor network dependencies and cascade risks.
    """
    
    def __init__(self):
        """Initialize network analyzer."""
        self.network = None
        self.vendor_graph = None
        self.centrality_cache = {}
        self.community_cache = {}
    
    async def analyze_dependencies(
        self,
        vendor_id: str,
        vendor_data: Dict[str, Any],
        network_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyze vendor dependencies and network risks.
        
        Args:
            vendor_id: Vendor identifier
            vendor_data: Vendor information
            network_data: Network relationship data
            
        Returns:
            List of network-based risks
        """
        risks = []
        
        # Build or update network
        if network_data:
            self.network = await self.build_network([vendor_id], network_data)
        
        # Analyze different types of network risks
        
        # 1. Cascade failure risk
        cascade_risk = await self._analyze_cascade_risk(vendor_id)
        if cascade_risk:
            risks.append(cascade_risk)
        
        # 2. Concentration risk
        concentration_risk = self._analyze_concentration_risk(vendor_id, vendor_data)
        if concentration_risk:
            risks.append(concentration_risk)
        
        # 3. Isolation risk
        isolation_risk = self._analyze_isolation_risk(vendor_id)
        if isolation_risk:
            risks.append(isolation_risk)
        
        # 4. Bottleneck risk
        bottleneck_risk = await self._analyze_bottleneck_risk(vendor_id)
        if bottleneck_risk:
            risks.append(bottleneck_risk)
        
        # 5. Supply chain depth risk
        supply_chain_risk = self._analyze_supply_chain_depth(vendor_id, vendor_data)
        if supply_chain_risk:
            risks.append(supply_chain_risk)
        
        return risks
    
    async def build_network(
        self,
        vendor_ids: List[str],
        relationships: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build vendor relationship network.
        
        Args:
            vendor_ids: List of vendor IDs
            relationships: Vendor relationship data
            
        Returns:
            Network structure and metrics
        """
        if NETWORKX_AVAILABLE:
            # Build NetworkX graph
            G = nx.DiGraph()
            
            # Add nodes
            for vendor_id in vendor_ids:
                G.add_node(vendor_id)
            
            # Add edges from relationships
            if relationships:
                for vendor_id in vendor_ids:
                    if vendor_id in relationships:
                        for dependency in relationships[vendor_id].get('depends_on', []):
                            G.add_edge(vendor_id, dependency, weight=1.0)
                        
                        for dependent in relationships[vendor_id].get('dependents', []):
                            G.add_edge(dependent, vendor_id, weight=1.0)
            
            self.vendor_graph = G
            
            # Calculate network metrics
            metrics = {
                "num_nodes": G.number_of_nodes(),
                "num_edges": G.number_of_edges(),
                "density": nx.density(G),
                "is_connected": nx.is_weakly_connected(G),
                "avg_degree": sum(dict(G.degree()).values()) / G.number_of_nodes() if G.number_of_nodes() > 0 else 0,
                "diameter": nx.diameter(G.to_undirected()) if nx.is_connected(G.to_undirected()) else -1
            }
            
            # Calculate centrality measures
            if G.number_of_nodes() > 0:
                metrics["degree_centrality"] = nx.degree_centrality(G)
                metrics["betweenness_centrality"] = nx.betweenness_centrality(G)
                metrics["pagerank"] = nx.pagerank(G)
            
            return metrics
        
        else:
            # Fallback to simple adjacency representation
            network = {
                "nodes": vendor_ids,
                "edges": [],
                "metrics": {
                    "num_nodes": len(vendor_ids),
                    "num_edges": 0
                }
            }
            
            if relationships:
                for vendor_id in vendor_ids:
                    if vendor_id in relationships:
                        for dep in relationships[vendor_id].get('depends_on', []):
                            network["edges"].append((vendor_id, dep))
                        network["metrics"]["num_edges"] = len(network["edges"])
            
            self.network = network
            return network
    
    async def _analyze_cascade_risk(
        self,
        vendor_id: str
    ) -> Optional[Dict[str, Any]]:
        """Analyze cascade failure risk."""
        if not NETWORKX_AVAILABLE or not self.vendor_graph:
            return None
        
        try:
            G = self.vendor_graph
            
            # Calculate how many vendors depend on this vendor
            dependents = list(G.predecessors(vendor_id))
            
            if len(dependents) == 0:
                return None
            
            # Calculate cascade impact
            cascade_impact = set(dependents)
            queue = deque(dependents)
            visited = {vendor_id}
            
            # BFS to find all affected vendors
            while queue:
                current = queue.popleft()
                if current not in visited:
                    visited.add(current)
                    for dependent in G.predecessors(current):
                        if dependent not in visited:
                            cascade_impact.add(dependent)
                            queue.append(dependent)
            
            if len(cascade_impact) > 2:
                severity = "critical" if len(cascade_impact) > 10 else "high" if len(cascade_impact) > 5 else "medium"
                
                return {
                    "level": severity,
                    "category": "Network",
                    "description": f"Vendor failure could cascade to {len(cascade_impact)} other vendors",
                    "impact": f"Supply chain disruption affecting {len(cascade_impact)} vendors",
                    "likelihood": 0.3 + (len(cascade_impact) * 0.05),  # Increases with cascade size
                    "mitigation_strategies": [
                        "Implement redundancy for critical dependencies",
                        "Create vendor failure response plan",
                        "Establish backup vendor relationships",
                        "Monitor vendor health indicators closely"
                    ],
                    "affected_vendors": list(cascade_impact)[:10]  # Limit to top 10
                }
        
        except Exception as e:
            logger.error(f"Cascade risk analysis failed: {e}")
        
        return None
    
    def _analyze_concentration_risk(
        self,
        vendor_id: str,
        vendor_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Analyze vendor concentration risk."""
        # Check if too much business depends on this vendor
        spend_percentage = vendor_data.get('spend_percentage', 0)
        critical_service = vendor_data.get('critical_service', False)
        sole_source = vendor_data.get('sole_source', False)
        
        risk_score = 0
        factors = []
        
        if spend_percentage > 20:
            risk_score += 30
            factors.append(f"{spend_percentage}% of total spend")
        
        if critical_service:
            risk_score += 40
            factors.append("Provides critical service")
        
        if sole_source:
            risk_score += 30
            factors.append("Sole source supplier")
        
        if risk_score >= 50:
            severity = "critical" if risk_score >= 80 else "high" if risk_score >= 60 else "medium"
            
            return {
                "level": severity,
                "category": "Concentration",
                "description": f"High concentration risk: {', '.join(factors)}",
                "impact": "Over-reliance on single vendor creates vulnerability",
                "likelihood": 0.6,
                "mitigation_strategies": [
                    "Develop alternative vendor options",
                    "Negotiate better terms leveraging volume",
                    "Create phased diversification plan",
                    "Implement vendor performance SLAs"
                ]
            }
        
        return None
    
    def _analyze_isolation_risk(
        self,
        vendor_id: str
    ) -> Optional[Dict[str, Any]]:
        """Analyze vendor isolation risk."""
        if not NETWORKX_AVAILABLE or not self.vendor_graph:
            return None
        
        try:
            G = self.vendor_graph
            
            # Check if vendor is isolated or poorly connected
            if vendor_id not in G:
                return None
            
            degree = G.degree(vendor_id)
            avg_degree = sum(dict(G.degree()).values()) / G.number_of_nodes()
            
            if degree < avg_degree * 0.3:  # Significantly below average connectivity
                return {
                    "level": "medium",
                    "category": "Network",
                    "description": "Vendor is isolated in supply network",
                    "impact": "Limited alternatives and negotiation leverage",
                    "likelihood": 0.4,
                    "mitigation_strategies": [
                        "Explore partnership opportunities",
                        "Investigate vendor's supplier network",
                        "Consider vertical integration options"
                    ]
                }
        
        except Exception as e:
            logger.error(f"Isolation risk analysis failed: {e}")
        
        return None
    
    async def _analyze_bottleneck_risk(
        self,
        vendor_id: str
    ) -> Optional[Dict[str, Any]]:
        """Analyze if vendor is a bottleneck in the network."""
        if not NETWORKX_AVAILABLE or not self.vendor_graph:
            return None
        
        try:
            G = self.vendor_graph
            
            if vendor_id not in G:
                return None
            
            # Calculate betweenness centrality (bottleneck metric)
            if vendor_id not in self.centrality_cache:
                self.centrality_cache = nx.betweenness_centrality(G)
            
            centrality = self.centrality_cache.get(vendor_id, 0)
            avg_centrality = np.mean(list(self.centrality_cache.values()))
            
            if centrality > avg_centrality * 2:  # Significant bottleneck
                return {
                    "level": "high",
                    "category": "Network",
                    "description": "Vendor is a critical bottleneck in supply chain",
                    "impact": "Single point of failure for multiple processes",
                    "likelihood": 0.7,
                    "mitigation_strategies": [
                        "Create parallel supply paths",
                        "Increase inventory buffers",
                        "Develop contingency routing plans",
                        "Strengthen vendor relationship"
                    ]
                }
        
        except Exception as e:
            logger.error(f"Bottleneck risk analysis failed: {e}")
        
        return None
    
    def _analyze_supply_chain_depth(
        self,
        vendor_id: str,
        vendor_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Analyze supply chain depth risk."""
        # Check tier level and supply chain complexity
        tier_level = vendor_data.get('tier_level', 1)
        num_sub_suppliers = vendor_data.get('sub_suppliers_count', 0)
        
        if tier_level > 2 or num_sub_suppliers > 10:
            risk_level = "high" if tier_level > 3 else "medium"
            
            return {
                "level": risk_level,
                "category": "Supply Chain",
                "description": f"Complex supply chain (Tier {tier_level}, {num_sub_suppliers} sub-suppliers)",
                "impact": "Reduced visibility and control over supply chain",
                "likelihood": 0.5,
                "mitigation_strategies": [
                    "Implement supply chain mapping",
                    "Require transparency reporting",
                    "Conduct periodic audits",
                    "Establish direct relationships with critical sub-suppliers"
                ]
            }
        
        return None
    
    async def simulate_cascade_failure(
        self,
        network: Dict[str, Any],
        failed_vendor: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Simulate cascade failure in vendor network.
        
        Args:
            network: Network structure
            failed_vendor: Initial failed vendor (random if not specified)
            
        Returns:
            Cascade failure analysis
        """
        if not NETWORKX_AVAILABLE or not self.vendor_graph:
            return {"error": "Network analysis not available"}
        
        try:
            G = self.vendor_graph.copy()
            
            # Select random vendor if not specified
            if not failed_vendor:
                failed_vendor = np.random.choice(list(G.nodes()))
            
            # Track cascade
            failed_nodes = {failed_vendor}
            cascade_rounds = [{failed_vendor}]
            
            # Simulate cascade
            for round_num in range(10):  # Max 10 rounds
                new_failures = set()
                
                for node in G.nodes():
                    if node not in failed_nodes:
                        # Check dependencies
                        dependencies = list(G.successors(node))
                        failed_deps = [d for d in dependencies if d in failed_nodes]
                        
                        # Fail if too many dependencies failed
                        if len(dependencies) > 0:
                            failure_ratio = len(failed_deps) / len(dependencies)
                            if failure_ratio > 0.5:  # Fails if >50% deps failed
                                new_failures.add(node)
                
                if not new_failures:
                    break
                
                failed_nodes.update(new_failures)
                cascade_rounds.append(new_failures)
            
            return {
                "initial_failure": failed_vendor,
                "total_failures": len(failed_nodes),
                "cascade_rounds": len(cascade_rounds),
                "affected_vendors": list(failed_nodes),
                "failure_percentage": len(failed_nodes) / G.number_of_nodes() * 100,
                "severity": "critical" if len(failed_nodes) > G.number_of_nodes() * 0.3 else "high"
            }
        
        except Exception as e:
            logger.error(f"Cascade simulation failed: {e}")
            return {"error": str(e)}
    
    async def identify_critical_nodes(
        self,
        network: Dict[str, Any]
    ) -> List[str]:
        """
        Identify critical nodes in the vendor network.
        
        Args:
            network: Network structure
            
        Returns:
            List of critical vendor IDs
        """
        if not NETWORKX_AVAILABLE or not self.vendor_graph:
            return []
        
        try:
            G = self.vendor_graph
            critical_nodes = []
            
            # Multiple criteria for criticality
            
            # 1. High degree centrality (many connections)
            degree_cent = nx.degree_centrality(G)
            high_degree = [n for n, c in degree_cent.items() 
                          if c > np.percentile(list(degree_cent.values()), 80)]
            
            # 2. High betweenness (on many paths)
            between_cent = nx.betweenness_centrality(G)
            high_between = [n for n, c in between_cent.items()
                           if c > np.percentile(list(between_cent.values()), 80)]
            
            # 3. High PageRank (important nodes)
            pagerank = nx.pagerank(G)
            high_pagerank = [n for n, c in pagerank.items()
                            if c > np.percentile(list(pagerank.values()), 80)]
            
            # Combine criteria
            critical_nodes = list(set(high_degree) & set(high_between))
            if not critical_nodes:
                critical_nodes = list(set(high_degree) | set(high_pagerank))
            
            return critical_nodes[:10]  # Return top 10 critical nodes
        
        except Exception as e:
            logger.error(f"Critical node identification failed: {e}")
            return []
    
    async def recommend_network_improvements(
        self,
        vendor_id: str
    ) -> List[str]:
        """
        Recommend network structure improvements.
        
        Args:
            vendor_id: Vendor to analyze
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        if not NETWORKX_AVAILABLE or not self.vendor_graph:
            recommendations.append("Enable network analysis tools for detailed recommendations")
            return recommendations
        
        try:
            G = self.vendor_graph
            
            if vendor_id not in G:
                return ["Vendor not found in network"]
            
            # Analyze vendor's position
            in_degree = G.in_degree(vendor_id)
            out_degree = G.out_degree(vendor_id)
            
            # Recommendations based on network position
            if out_degree > 5:
                recommendations.append(f"Vendor has {out_degree} dependencies - consider reducing")
            
            if in_degree > 10:
                recommendations.append(f"{in_degree} vendors depend on this vendor - ensure reliability")
            
            if in_degree == 0 and out_degree == 0:
                recommendations.append("Vendor is isolated - explore integration opportunities")
            
            # Check for redundancy
            dependencies = list(G.successors(vendor_id))
            for dep in dependencies:
                alternatives = [n for n in G.nodes() 
                              if n != dep and nx.has_path(G, vendor_id, n)]
                if len(alternatives) < 2:
                    recommendations.append(f"Add backup options for dependency on {dep}")
            
            # Check centrality
            centrality = nx.betweenness_centrality(G).get(vendor_id, 0)
            avg_centrality = np.mean(list(nx.betweenness_centrality(G).values()))
            
            if centrality > avg_centrality * 2:
                recommendations.append("Vendor is a bottleneck - create parallel paths")
            
        except Exception as e:
            logger.error(f"Network improvement recommendation failed: {e}")
            recommendations.append("Analysis error - manual review recommended")
        
        return recommendations[:5]  # Return top 5 recommendations