"""
Time-Dependent Dijkstra Routing Engine.
Implements Feature 1: Arrival-time road-failure check and Safety vs Speed optimization.
"""

import heapq
import math
from typing import Dict, List, Tuple, Any, Optional
from app.models.state import RoadEdge, HazardForecast
from app.risk.road_failure import RoadFailureModel
from app.config import ASSUMPTIONS

class TimeDependentRouter:
    def __init__(self, scenario_engine):
        self.scenario_engine = scenario_engine

    def _build_adjacency_graph(self, edges: List[RoadEdge]) -> Dict[str, List[RoadEdge]]:
        adj: Dict[str, List[RoadEdge]] = {}
        for edge in edges:
            if edge.source_node not in adj:
                adj[edge.source_node] = []
            if edge.target_node not in adj:
                adj[edge.target_node] = []
            
            # Bidirectional network
            adj[edge.source_node].append(edge)
            
            # Reverse edge for undirected traversal
            rev_edge = edge.model_copy()
            rev_edge.source_node = edge.target_node
            rev_edge.target_node = edge.source_node
            rev_edge.geometry = list(reversed(edge.geometry))
            adj[edge.target_node].append(rev_edge)
        return adj

    def find_nearest_node(self, coords: List[float]) -> str:
        """Finds closest node in the road network to the given [lon, lat] coordinates."""
        state = self.scenario_engine.get_current_state()
        nodes = self.scenario_engine.road_network["nodes"]
        best_node = nodes[0]["id"]
        min_dist = float("inf")
        lon1, lat1 = coords[0], coords[1]
        
        for n in nodes:
            lon2, lat2 = n["lon"], n["lat"]
            # Euclidean distance approximation
            dist = math.sqrt((lon1 - lon2) ** 2 + (lat1 - lat2) ** 2)
            if dist < min_dist:
                min_dist = dist
                best_node = n["id"]
        return best_node

    def find_route(
        self,
        origin_node: str,
        target_node: str,
        start_time_offset_min: float = 0.0,
        safety_weight: float = 0.50, # 0.0 (fastest) to 1.0 (safest)
        caution_factor: float = 1.0,
        is_evacuation: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Calculates time-dependent optimal route from origin to destination.
        Evaluates road failure conditions dynamically at the vehicle's arrival time at each edge.
        """
        state = self.scenario_engine.get_current_state()
        forecast = state.forecast
        adj = self._build_adjacency_graph(state.road_edges)
        block_threshold = (
            ASSUMPTIONS["EVACUATION_ROUTE_BLOCK_THRESHOLD"]
            if is_evacuation
            else ASSUMPTIONS["ROUTE_BLOCK_THRESHOLD"]
        )

        if origin_node == target_node:
            return {
                "origin": origin_node,
                "target": target_node,
                "total_time_min": 0.0,
                "total_distance_m": 0.0,
                "average_risk": 0.0,
                "nodes_path": [origin_node],
                "edges_path": [],
                "polyline": [],
                "is_feasible": True
            }

        # Priority Queue: (cumulative_weighted_cost, cumulative_time_min, current_node, path_nodes, path_edges, path_coords, total_risk)
        pq = [(0.0, start_time_offset_min, origin_node, [origin_node], [], [], 0.0)]
        visited_times: Dict[str, float] = {}

        while pq:
            cost, cur_time_min, u, path_nodes, path_edges, polyline, total_risk = heapq.heappop(pq)

            if u in visited_times and visited_times[u] <= cost:
                continue
            visited_times[u] = cost

            if u == target_node:
                total_time = cur_time_min - start_time_offset_min
                avg_risk = total_risk / max(1, len(path_edges))
                return {
                    "origin": origin_node,
                    "target": target_node,
                    "total_time_min": round(total_time, 2),
                    "total_distance_m": sum(e.length_m for e in path_edges),
                    "average_risk": round(avg_risk, 3),
                    "nodes_path": path_nodes,
                    "edges_path": [e.id for e in path_edges],
                    "polyline": polyline,
                    "is_feasible": True
                }

            for edge in adj.get(u, []):
                v = edge.target_node
                
                # Arrival-time road failure check (Feature 1)
                p_fail = RoadFailureModel.calculate_failure_probability(
                    edge=edge,
                    forecast=forecast,
                    time_offset_min=cur_time_min,
                    caution_factor=caution_factor
                )

                if p_fail >= block_threshold:
                    # Impassable at arrival time
                    continue

                edge_travel_time_min = edge.base_travel_time_sec / 60.0
                next_arrival_time = cur_time_min + edge_travel_time_min

                # Multi-objective cost: alpha * time + (1 - alpha) * risk_penalty
                # Speed preference vs Safety preference
                speed_cost = edge_travel_time_min
                risk_cost = p_fail * 30.0 # 30 min equivalent penalty for high hazard edge
                edge_cost = (1.0 - safety_weight) * speed_cost + (safety_weight) * risk_cost

                next_cost = cost + edge_cost
                next_polyline = polyline + edge.geometry
                next_risk = total_risk + p_fail

                heapq.heappush(pq, (
                    next_cost,
                    next_arrival_time,
                    v,
                    path_nodes + [v],
                    path_edges + [edge],
                    next_polyline,
                    next_risk
                ))

        # No feasible route found (cut off by floods or closures)
        return {
            "origin": origin_node,
            "target": target_node,
            "total_time_min": float("inf"),
            "total_distance_m": 0.0,
            "average_risk": 1.0,
            "nodes_path": [],
            "edges_path": [],
            "polyline": [],
            "is_feasible": False,
            "failure_reason": "All connecting corridors blocked by flood or road failures at arrival time."
        }
