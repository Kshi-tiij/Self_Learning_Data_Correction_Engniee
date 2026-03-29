# FILE LOCATION 1: backend/registry/model_registry.py
# Purpose: Model versioning and registry management
# ========================================================================

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import joblib

logger = logging.getLogger(__name__)

class ModelRegistry:
    """Manage model versions and metadata"""
    
    def __init__(self, registry_dir: Path):
        self.registry_dir = Path(registry_dir)
        self.registry_dir.mkdir(parents=True, exist_ok=True)
        self.registry_file = self.registry_dir / 'registry.json'
        self.versions = self._load_registry()
    
    def _load_registry(self) -> Dict[str, Any]:
        """Load registry from file"""
        if self.registry_file.exists():
            with open(self.registry_file, 'r') as f:
                return json.load(f)
        return {}
    
    def _save_registry(self) -> None:
        """Save registry to file"""
        with open(self.registry_file, 'w') as f:
            json.dump(self.versions, f, indent=2, default=str)
    
    def register_model(self, model_name: str, model, metrics: Dict[str, float],
                      metadata: Dict[str, Any] = None) -> str:
        """
        Register a new model version
        
        Returns:
            Version ID
        """
        version_id = f"v{len(self.versions) + 1}"
        
        version_info = {
            'version_id': version_id,
            'model_name': model_name,
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics,
            'metadata': metadata or {},
            'status': 'active'
        }
        
        # Save model file
        model_path = self.registry_dir / f"{version_id}_{model_name}.pkl"
        joblib.dump(model, model_path)
        version_info['model_path'] = str(model_path)
        
        self.versions[version_id] = version_info
        self._save_registry()
        
        logger.info(f"Registered model version: {version_id}")
        return version_id
    
    def get_model(self, version_id: str):
        """Load model from registry"""
        if version_id not in self.versions:
            raise ValueError(f"Version {version_id} not found")
        
        model_path = self.versions[version_id]['model_path']
        return joblib.load(model_path)
    
    def get_latest_version(self) -> Optional[str]:
        """Get latest model version"""
        if not self.versions:
            return None
        
        return max(self.versions.keys(), key=lambda x: self.versions[x]['timestamp'])
    
    def list_versions(self) -> List[Dict[str, Any]]:
        """List all versions"""
        return [
            {'version_id': v_id, **v_info}
            for v_id, v_info in sorted(self.versions.items(), 
                                      key=lambda x: x[1]['timestamp'], reverse=True)
        ]
    
    def rollback_to_version(self, version_id: str) -> None:
        """Set version as active"""
        if version_id not in self.versions:
            raise ValueError(f"Version {version_id} not found")
        
        # Set all to inactive, then activate target
        for v in self.versions.values():
            v['status'] = 'inactive'
        
        self.versions[version_id]['status'] = 'active'
        self._save_registry()
        
        logger.info(f"Rolled back to version: {version_id}")
    
    def get_active_version(self) -> Optional[Dict[str, Any]]:
        """Get currently active version"""
        for v_id, v_info in self.versions.items():
            if v_info.get('status') == 'active':
                return {' version_id': v_id, **v_info}
        return None
    
    def delete_old_versions(self, keep_n: int = 5) -> None:
        """Delete old versions keeping only most recent"""
        if len(self.versions) <= keep_n:
            return
        
        sorted_versions = sorted(self.versions.items(),
                                key=lambda x: x[1]['timestamp'], reverse=True)
        
        for v_id, v_info in sorted_versions[keep_n:]:
            model_path = Path(v_info['model_path'])
            if model_path.exists():
                model_path.unlink()
            
            del self.versions[v_id]
            logger.info(f"Deleted old version: {v_id}")
        
        self._save_registry()