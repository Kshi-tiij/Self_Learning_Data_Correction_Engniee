# FILE LOCATION: backend/explainability/similarity.py
# Purpose: Similarity engine for finding related corrected samples

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
import logging
from typing import List, Dict, Tuple, Any

logger = logging.getLogger(__name__)

class SimilarityEngine:
    """Find similar samples in feature or embedding space"""
    
    def __init__(self, metric: str = 'euclidean'):
        """
        Args:
            metric: 'euclidean' or 'cosine'
        """
        self.metric = metric
        self.reference_X = None
        self.reference_ids = None
        self.reference_decisions = None
        logger.info(f"SimilarityEngine initialized with metric: {metric}")
    
    def index_samples(self, X: np.ndarray, sample_ids: List[int], 
                     decisions: List[str]) -> None:
        """
        Index samples for similarity search
        
        Args:
            X: Feature matrix of reference samples
            sample_ids: IDs of reference samples
            decisions: Review decisions for reference samples
        """
        self.reference_X = X
        self.reference_ids = np.array(sample_ids)
        self.reference_decisions = np.array(decisions)
        
        logger.info(f"Indexed {len(X)} samples for similarity search")
    
    def compute_similarity(self, X_query: np.ndarray, X_ref: np.ndarray) -> np.ndarray:
        """
        Compute similarity between query and reference samples
        
        Args:
            X_query: Query feature matrix (n_query, n_features)
            X_ref: Reference feature matrix (n_ref, n_features)
        
        Returns:
            Similarity matrix (n_query, n_ref)
        """
        if self.metric == 'euclidean':
            # Compute Euclidean distance
            distances = euclidean_distances(X_query, X_ref)
            # Convert to similarity (smaller distance = higher similarity)
            similarities = 1.0 / (1.0 + distances)
        elif self.metric == 'cosine':
            # Compute cosine similarity
            similarities = cosine_similarity(X_query, X_ref)
            # Ensure in [0, 1]
            similarities = (similarities + 1.0) / 2.0
        else:
            raise ValueError(f"Unknown metric: {self.metric}")
        
        return similarities
    
    def find_similar_samples(self, X_sample: np.ndarray, k: int = 5, 
                            threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        Find top-k similar samples to a query sample
        
        Args:
            X_sample: Feature vector of query sample (1D array or 2D with 1 row)
            k: Number of similar samples to return
            threshold: Minimum similarity threshold
        
        Returns:
            List of dicts with similar sample information
        """
        if self.reference_X is None:
            logger.warning("No reference samples indexed")
            return []
        
        # Ensure 2D
        if len(X_sample.shape) == 1:
            X_sample = X_sample.reshape(1, -1)
        
        # Compute similarities
        similarities = self.compute_similarity(X_sample, self.reference_X)[0]
        
        # Filter by threshold
        valid_indices = np.where(similarities >= threshold)[0]
        
        if len(valid_indices) == 0:
            logger.info(f"No similar samples found above threshold {threshold}")
            return []
        
        # Get top-k
        top_k_indices = valid_indices[np.argsort(similarities[valid_indices])[-k:][::-1]]
        
        # Build results
        results = []
        for idx in top_k_indices:
            results.append({
                'sample_id': int(self.reference_ids[idx]),
                'similarity': float(similarities[idx]),
                'decision': self.reference_decisions[idx],
                'distance_rank': int(k - len(results) + 1)
            })
        
        return results
    
    def find_batch_similar_samples(self, X_batch: np.ndarray, k: int = 5,
                                   threshold: float = 0.5) -> List[List[Dict[str, Any]]]:
        """
        Find similar samples for a batch of queries
        
        Args:
            X_batch: Feature matrix of query samples (n_query, n_features)
            k: Number of similar samples per query
            threshold: Minimum similarity threshold
        
        Returns:
            List of lists containing similar sample information
        """
        results = []
        for i in range(len(X_batch)):
            similar = self.find_similar_samples(X_batch[i], k, threshold)
            results.append(similar)
        
        return results


class EmbeddingBasedSimilarity:
    """Similarity using learned embeddings"""
    
    def __init__(self, embedding_dim: int = 32):
        self.embedding_dim = embedding_dim
        self.embeddings = None
        self.embedding_ids = None
    
    def learn_embeddings(self, X: np.ndarray, y: np.ndarray = None, 
                        method: str = 'pca') -> None:
        """
        Learn embeddings from features
        
        Args:
            X: Feature matrix
            y: Optional labels for supervised embedding
            method: 'pca' or 'umap'
        """
        if method == 'pca':
            from sklearn.decomposition import PCA
            pca = PCA(n_components=min(self.embedding_dim, X.shape[1]))
            self.embeddings = pca.fit_transform(X)
        
        elif method == 'umap':
            try:
                import umap
                reducer = umap.UMAP(n_components=self.embedding_dim)
                self.embeddings = reducer.fit_transform(X)
            except ImportError:
                logger.warning("UMAP not installed, falling back to PCA")
                self.learn_embeddings(X, y, 'pca')
        
        logger.info(f"Learned embeddings with shape {self.embeddings.shape}")
    
    def find_similar_in_embedding_space(self, query_embedding: np.ndarray, k: int = 5) -> List[int]:
        """Find similar samples in embedding space"""
        if self.embeddings is None:
            raise ValueError("Embeddings not learned")
        
        # Compute distances in embedding space
        distances = np.linalg.norm(self.embeddings - query_embedding, axis=1)
        
        # Get top-k
        top_k_indices = np.argsort(distances)[:k]
        
        return top_k_indices.tolist()


class SemanticSimilarityMatcher:
    """Match similar samples based on semantic features"""
    
    def __init__(self):
        self.categorical_feature_mappings = {}
        self.numeric_feature_ranges = {}
    
    def build_feature_index(self, df: pd.DataFrame, categorical_cols: List[str],
                           numeric_cols: List[str]) -> None:
        """
        Build index of feature values
        
        Args:
            df: Data frame with features
            categorical_cols: Names of categorical columns
            numeric_cols: Names of numeric columns
        """
        # Index categorical features
        for col in categorical_cols:
            self.categorical_feature_mappings[col] = df[col].unique().tolist()
        
        # Index numeric ranges
        for col in numeric_cols:
            self.numeric_feature_ranges[col] = {
                'min': df[col].min(),
                'max': df[col].max(),
                'mean': df[col].mean(),
                'std': df[col].std()
            }
        
        logger.info("Feature index built")
    
    def compute_semantic_similarity(self, sample1: Dict[str, Any], sample2: Dict[str, Any],
                                   categorical_cols: List[str],
                                   numeric_cols: List[str]) -> float:
        """
        Compute semantic similarity between two samples
        
        Args:
            sample1, sample2: Feature dictionaries
            categorical_cols: Categorical feature names
            numeric_cols: Numeric feature names
        
        Returns:
            Similarity score [0, 1]
        """
        similarities = []
        
        # Categorical similarity (1 if match, 0 if different)
        for col in categorical_cols:
            if col in sample1 and col in sample2:
                sim = 1.0 if sample1[col] == sample2[col] else 0.0
                similarities.append(sim)
        
        # Numeric similarity (based on normalized distance)
        for col in numeric_cols:
            if col in sample1 and col in sample2:
                if col in self.numeric_feature_ranges:
                    range_info = self.numeric_feature_ranges[col]
                    feature_range = range_info['max'] - range_info['min']
                    
                    if feature_range > 0:
                        distance = abs(sample1[col] - sample2[col]) / feature_range
                        sim = max(0, 1 - distance)
                        similarities.append(sim)
        
        if not similarities:
            return 0.0
        
        return float(np.mean(similarities))
    
    def find_semantically_similar(self, query_sample: Dict[str, Any],
                                 reference_samples: List[Dict[str, Any]],
                                 categorical_cols: List[str],
                                 numeric_cols: List[str],
                                 k: int = 5) -> List[Tuple[int, float]]:
        """
        Find semantically similar samples
        
        Returns:
            List of (sample_idx, similarity) tuples
        """
        similarities = []
        
        for idx, ref_sample in enumerate(reference_samples):
            sim = self.compute_semantic_similarity(query_sample, ref_sample,
                                                  categorical_cols, numeric_cols)
            similarities.append((idx, sim))
        
        # Sort by similarity and return top-k
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:k]


# Export classes
__all__ = [
    'SimilarityEngine',
    'EmbeddingBasedSimilarity',
    'SemanticSimilarityMatcher'
]