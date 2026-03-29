# FILE LOCATION 4: backend/governance/rbac.py
# Purpose: Role-based access control
# ========================================================================

from enum import Enum

class Role(Enum):
    ADMIN = 'admin'
    REVIEWER = 'reviewer'
    VIEWER = 'viewer'

class RBACManager:
    """Manage role-based access control"""
    
    PERMISSIONS = {
        Role.ADMIN: [
            'upload_data', 'train_model', 'approve_correction',
            'manage_users', 'retrain', 'rollback', 'delete_data'
        ],
        Role.REVIEWER: [
            'view_data', 'review_corrections', 'provide_feedback'
        ],
        Role.VIEWER: [
            'view_dashboards', 'view_reports'
        ]
    }
    
    def __init__(self):
        self.users = {}
    
    def add_user(self, user_id: str, role: Role) -> None:
        """Add user with role"""
        self.users[user_id] = {
            'role': role,
            'created_at': datetime.now().isoformat()
        }
    
    def check_permission(self, user_id: str, action: str) -> bool:
        """Check if user can perform action"""
        if user_id not in self.users:
            return False
        
        user_role = self.users[user_id]['role']
        permissions = self.PERMISSIONS.get(user_role, [])
        
        return action in permissions
    
    def get_user_permissions(self, user_id: str) -> List[str]:
        """Get all permissions for user"""
        if user_id not in self.users:
            return []
        
        user_role = self.users[user_id]['role']
        return self.PERMISSIONS.get(user_role, [])

