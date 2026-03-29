class FeedbackManager:
    """Manage human feedback for model improvement"""
    
    def __init__(self, feedback_file: Path):
        self.feedback_file = Path(feedback_file)
        self.feedback_file.parent.mkdir(parents=True, exist_ok=True)
        self.feedback_records = self._load_feedback()
    
    def _load_feedback(self) -> List[Dict[str, Any]]:
        """Load feedback records"""
        if self.feedback_file.exists():
            df = pd.read_csv(self.feedback_file)
            return df.to_dict('records')
        return []
    
    def _save_feedback(self) -> None:
        """Save feedback to file"""
        df = pd.DataFrame(self.feedback_records)
        df.to_csv(self.feedback_file, index=False)
    
    def add_feedback(self, sample_id: int, original_value: Any, predicted_value: Any,
                    corrected_value: Any = None, decision: str = 'approve',
                    reviewer_id: str = None, notes: str = None) -> None:
        """
        Add feedback record
        
        Args:
            sample_id: ID of sample
            original_value: Original label
            predicted_value: Model prediction
            corrected_value: Human correction (if any)
            decision: 'approve', 'reject', 'unsure'
            reviewer_id: ID of reviewer
            notes: Additional notes
        """
        record = {
            'timestamp': datetime.now().isoformat(),
            'sample_id': sample_id,
            'original_value': original_value,
            'predicted_value': predicted_value,
            'corrected_value': corrected_value,
            'decision': decision,
            'reviewer_id': reviewer_id,
            'notes': notes
        }
        
        self.feedback_records.append(record)
        self._save_feedback()
        
        logger.info(f"Feedback recorded for sample {sample_id}: {decision}")
    
    def get_feedback_statistics(self) -> Dict[str, Any]:
        """Get feedback statistics"""
        if not self.feedback_records:
            return {}
        
        df = pd.DataFrame(self.feedback_records)
        
        return {
            'total_feedback': len(df),
            'approved_count': len(df[df['decision'] == 'approve']),
            'rejected_count': len(df[df['decision'] == 'reject']),
            'unsure_count': len(df[df['decision'] == 'unsure']),
            'correction_rate': float((df['corrected_value'].notna()).sum() / len(df)),
            'unique_reviewers': int(df['reviewer_id'].nunique())
        }
    
    def get_feedback_for_retraining(self) -> pd.DataFrame:
        """Get feedback records for model retraining"""
        if not self.feedback_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(self.feedback_records)
        
        # Include approved corrections
        return df[df['corrected_value'].notna()]

