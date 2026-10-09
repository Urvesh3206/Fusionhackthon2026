"""
Report Generation & Formula-Injection Protected Export Utility.
Protects against CSV injection vulnerabilities in Excel/Sheets.
"""

import io
import csv
from typing import List, Dict, Any

def sanitize_csv_cell(val: Any) -> str:
    """
    Sanitizes string to prevent CSV formula injection vulnerability.
    If string starts with =, +, -, @, tab, or carriage return, prepends a single quote.
    """
    if val is None:
        return ""
    s = str(val).strip()
    if s and s[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + s
    return s

def export_incidents_to_csv(incidents: List[Dict[str, Any]]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "Incident ID", "Title", "Type", "Priority", "Status", 
        "Location", "Affected Population", "Assigned Vehicle", 
        "Recommended Hospital", "Reported Time", "Verification Status"
    ]
    writer.writerow(headers)
    
    for inc in incidents:
        writer.writerow([
            sanitize_csv_cell(inc.get("id")),
            sanitize_csv_cell(inc.get("title")),
            sanitize_csv_cell(inc.get("incident_type")),
            sanitize_csv_cell(inc.get("priority")),
            sanitize_csv_cell(inc.get("status")),
            sanitize_csv_cell(inc.get("location_name")),
            sanitize_csv_cell(inc.get("affected_population")),
            sanitize_csv_cell(inc.get("assigned_vehicle_id") or "Unassigned"),
            sanitize_csv_cell(inc.get("recommended_hospital_id") or "Pending"),
            sanitize_csv_cell(inc.get("reported_time")),
            sanitize_csv_cell(inc.get("verification_status"))
        ])
    
    return output.getvalue()

def export_audit_logs_to_csv(audit_logs: List[Dict[str, Any]]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "Log ID", "Timestamp", "Actor", "Role", "Action Type", 
        "Entity ID", "Entity Type", "Justification", "Details"
    ]
    writer.writerow(headers)
    
    for log in audit_logs:
        writer.writerow([
            sanitize_csv_cell(log.get("id")),
            sanitize_csv_cell(log.get("timestamp")),
            sanitize_csv_cell(log.get("actor_name")),
            sanitize_csv_cell(log.get("actor_role")),
            sanitize_csv_cell(log.get("action_type")),
            sanitize_csv_cell(log.get("entity_id")),
            sanitize_csv_cell(log.get("entity_type")),
            sanitize_csv_cell(log.get("justification") or "N/A"),
            sanitize_csv_cell(str(log.get("details", {})))
        ])
    
    return output.getvalue()
