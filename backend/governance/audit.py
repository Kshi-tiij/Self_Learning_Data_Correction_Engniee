# FILE LOCATION 5: backend/governance/audit.py
# Purpose: Audit logging
# ========================================================================

class AuditLogger:
    """Log audit events"""
    
    def __init__(self, log_file: Path):
        self.log_file = Path(log_file)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
    
    def log_event(self, event_type: str, user_id: str, action: str,
                 details: Dict[str, Any] = None) -> None:
        """Log audit event"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'action': action,
            'details': details or {}
        }
        
        # Append to audit log
        if self.log_file.exists():
            df = pd.read_csv(self.log_file)
            df = pd.concat([df, pd.DataFrame([event])], ignore_index=True)
        else:
            df = pd.DataFrame([event])
        
        df.to_csv(self.log_file, index=False)
        logger.info(f"Audit event logged: {event_type} by {user_id}")


# Export all classes
import pandas as pd
__all__ = [
    'ModelRegistry',
    'FeedbackManager',
    'MetricsMonitor',
    'RBACManager',
    'AuditLogger'
]