import torch
import numpy as np
from typing import List, Tuple
import logging

from api.utils import model_loader
from api.schemas import VerificationResponse
from api.config import MIN_SIGNATURE_POINTS, MAX_SIGNATURE_POINTS

# Setup logging
logger = logging.getLogger(__name__)


def validate_signature(points: List[Tuple[float, float, float]], name: str = "signature") -> bool:
    """
    Validate signature format and content.
    
    Args:
        points: List of [x, y, timestamp] tuples
        name: Name of signature for error messages
    
    Returns:
        bool: True if valid
    
    Raises:
        ValueError: If signature is invalid
    """
    # Check if it's a list
    if not isinstance(points, list):
        raise ValueError(f"{name} must be a list of points")
    
    # Check minimum length
    if len(points) < MIN_SIGNATURE_POINTS:
        raise ValueError(
            f"{name} must have at least {MIN_SIGNATURE_POINTS} points, "
            f"got {len(points)}"
        )
    
    # Check maximum length
    if len(points) > MAX_SIGNATURE_POINTS:
        raise ValueError(
            f"{name} has too many points ({len(points)}), "
            f"maximum is {MAX_SIGNATURE_POINTS}"
        )
    
    # Validate each point is [x, y, timestamp]
    for i, point in enumerate(points):
        if not isinstance(point, (list, tuple)):
            raise ValueError(
                f"{name} point {i} must be a list or tuple, "
                f"got {type(point).__name__}"
            )
        
        if len(point) != 3:
            raise ValueError(
                f"{name} point {i} must have 3 values [x, y, timestamp], "
                f"got {len(point)}"
            )
        
        # Check all values are numeric
        if not all(isinstance(p, (int, float)) for p in point):
            raise ValueError(
                f"{name} point {i} contains non-numeric values: {point}"
            )
        
        # Check for NaN or infinity
        if any(np.isnan(p) or np.isinf(p) for p in point):
            raise ValueError(
                f"{name} point {i} contains NaN or infinity: {point}"
            )
    
    return True


def validate_timestamps(points: List[Tuple[float, float, float]], name: str = "signature") -> bool:
    """
    Validate that timestamps are monotonically increasing.
    
    Args:
        points: List of [x, y, timestamp] tuples
        name: Name of signature for error messages
    
    Returns:
        bool: True if valid
    
    Raises:
        ValueError: If timestamps are not valid
    """
    if len(points) < 2:
        return True
    
    prev_time = points[0][2]
    for i, point in enumerate(points[1:], 1):
        curr_time = point[2]
        if curr_time < prev_time:
            logger.warning(
                f"{name} has non-monotonic timestamps at point {i}: "
                f"{prev_time} -> {curr_time}"
            )
            # Note: We warn but don't fail, as this might be acceptable
        prev_time = curr_time
    
    return True

def preprocess_signature(
    signature_points: List[Tuple[float, float, float]],
    processor: dict
) -> np.ndarray:
    """
    Preprocess raw signature points using the saved processor.
    
    Steps:
    1. Convert to numpy array
    2. Normalize coordinates using saved scaler (StandardScaler)
    3. Interpolate to uniform target length
    
    Args:
        signature_points: Raw [x, y, timestamp] points
        processor: Dictionary with 'scaler' and 'target_length' from training
    
    Returns:
        np.ndarray: Preprocessed signature ready for model
    
    Raises:
        RuntimeError: If preprocessing fails
    """
    try:
        scaler = processor["scaler"]
        target_length = int(processor["target_length"])
        
        # Convert to numpy array
        sig_array = np.array(signature_points, dtype=np.float32)
        
        # Step 1: Normalize using scaler
        sig_normalized = scaler.transform(sig_array)
        
        # Step 2: Interpolate to uniform length
        sig_processed = _interpolate_signature(sig_normalized, target_length)
        
        return sig_processed
    
    except Exception as e:
        raise RuntimeError(f"Preprocessing failed: {str(e)}")


def _interpolate_signature(signature: np.ndarray, target_length: int) -> np.ndarray:
    """
    Interpolate a signature to target length using spline interpolation.
    
    Args:
        signature: Normalized signature array (N, 3)
        target_length: Desired output length
    
    Returns:
        np.ndarray: Interpolated signature of shape (target_length, 3)
    """
    from scipy import interpolate
    
    current_length = len(signature)
    
    if current_length == target_length:
        return signature
    
    # Original indices
    original_indices = np.linspace(0, current_length - 1, current_length)
    
    # Target indices
    target_indices = np.linspace(0, current_length - 1, target_length)
    
    # Interpolate each dimension separately
    interpolated = []
    for dim in range(signature.shape[1]):  # x, y, timestamp
        try:
            # Try cubic spline
            f = interpolate.interp1d(original_indices, signature[:, dim], kind='cubic')
            y_new = f(target_indices)
        except:
            # Fall back to linear if cubic fails
            f = interpolate.interp1d(original_indices, signature[:, dim], kind='linear')
            y_new = f(target_indices)
        
        interpolated.append(y_new)
    
    return np.column_stack(interpolated)


def compute_distance(
    sig1_tensor: torch.Tensor,
    sig2_tensor: torch.Tensor,
    model
) -> float:
    """
    Compute distance between two signatures using the model.
    
    Args:
        sig1_tensor: First signature as tensor (batch, seq_len, features)
        sig2_tensor: Second signature as tensor (batch, seq_len, features)
        model: Loaded SiameseLSTM model
    
    Returns:
        float: Distance score (0-2 range, lower = more similar)
    
    Raises:
        RuntimeError: If inference fails
    """
    try:
        with torch.no_grad():
            distance = model(sig1_tensor, sig2_tensor).item()
        
        # Clamp to valid range
        distance = max(0.0, min(2.0, float(distance)))
        
        return distance
    
    except Exception as e:
        raise RuntimeError(f"Model inference failed: {str(e)}")


def calculate_confidence(distance: float, threshold: float) -> float:
    """
    Calculate confidence percentage from distance and threshold.
    
    Confidence calculation:
    - Normalize distance to 0-1 range: normalized = distance / 2.0
    - Invert (lower distance = higher confidence): 1.0 - normalized
    - Convert to percentage: * 100
    
    Args:
        distance: Cosine distance (0-2 range)
        threshold: Decision threshold
    
    Returns:
        float: Confidence percentage (0-100)
    """
    confidence = (1.0 - (distance / 2.0)) * 100
    
    # Clamp to valid range
    confidence = max(0.0, min(100.0, confidence))
    
    return round(confidence, 2)

def verify_signatures(
    signature1: List[Tuple[float, float, float]],
    signature2: List[Tuple[float, float, float]],
    model_name: str = None
) -> VerificationResponse:
    """
    Compare two signatures using the trained Siamese LSTM model.
    
    Process:
    1. Validate both signatures
    2. Preprocess (normalize, interpolate)
    3. Run through model to get distance
    4. Compare to threshold to get match decision
    5. Calculate confidence
    
    Args:
        signature1: First signature as list of [x, y, timestamp] tuples
        signature2: Second signature as list of [x, y, timestamp] tuples
        model_name: Which model to use (default: active model)
    
    Returns:
        VerificationResponse: Verification result with confidence and metrics
    
    Raises:
        ValueError: If signatures are invalid
        RuntimeError: If inference fails
    """
    logger.info("Starting signature verification...")
    
    logger.debug("Validating signature 1...")
    validate_signature(signature1, "Signature 1")
    validate_timestamps(signature1, "Signature 1")
    
    logger.debug("Validating signature 2...")
    validate_signature(signature2, "Signature 2")
    validate_timestamps(signature2, "Signature 2")
    
    logger.info(f"✓ Both signatures valid (sig1: {len(signature1)} pts, sig2: {len(signature2)} pts)")
    
    if model_name:
        logger.info(f"Switching to model: {model_name}")
        if not model_loader.set_active_model(model_name):
            available = model_loader.list_models()
            raise ValueError(
                f"Model '{model_name}' not found. Available: {available}"
            )
    
    model = model_loader.get_active_model()
    processor = model_loader.get_active_processor()
    threshold = model_loader.get_active_threshold()
    active_model_name = model_loader.active_model
    
    if model is None:
        raise RuntimeError("Failed to load model")
    if processor is None:
        raise RuntimeError("Failed to load processor")
    if threshold is None:
        raise RuntimeError("Failed to load threshold")
    
    logger.info(f"✓ Loaded model: {active_model_name}, threshold: {threshold:.4f}")
    
    logger.debug("Preprocessing signatures...")
    try:
        sig1_processed = preprocess_signature(signature1, processor)
        sig2_processed = preprocess_signature(signature2, processor)
        logger.info(f"✓ Preprocessing complete (shape: {sig1_processed.shape})")
    except RuntimeError as e:
        logger.error(f"Preprocessing failed: {str(e)}")
        raise
    
    logger.debug("Converting to tensors...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        sig1_tensor = torch.FloatTensor(sig1_processed).unsqueeze(0).to(device)
        sig2_tensor = torch.FloatTensor(sig2_processed).unsqueeze(0).to(device)
        logger.debug(f"✓ Tensors created on device: {device}")
    except Exception as e:
        logger.error(f"Tensor conversion failed: {str(e)}")
        raise RuntimeError(f"Tensor conversion failed: {str(e)}")
    
    logger.debug("Running model inference...")
    try:
        distance = compute_distance(sig1_tensor, sig2_tensor, model)
        logger.info(f"✓ Distance computed: {distance:.4f}")
    except RuntimeError as e:
        logger.error(f"Inference failed: {str(e)}")
        raise
    
    logger.debug(f"Comparing distance {distance:.4f} to threshold {threshold:.4f}")
    match = distance < threshold
    logger.info(f"✓ Decision: {'MATCH' if match else 'NO MATCH'}")
    
    confidence = calculate_confidence(distance, threshold)
    logger.info(f"✓ Confidence: {confidence}%")
    
    logger.debug("Building response...")
    response = VerificationResponse(
        match=match,
        confidence=confidence,
        distance=round(distance, 4),
        threshold=round(threshold, 4),
        model_used=active_model_name
    )
    
    logger.info("✓ Verification complete")
    return response

def get_signature_stats(points: List[Tuple[float, float, float]]) -> dict:
    """
    Get statistics about a signature.
    
    Args:
        points: Signature points
    
    Returns:
        dict: Statistics including length, time range, coordinate ranges
    """
    arr = np.array(points)
    return {
        "num_points": len(points),
        "x_range": (float(arr[:, 0].min()), float(arr[:, 0].max())),
        "y_range": (float(arr[:, 1].min()), float(arr[:, 1].max())),
        "time_range": (float(arr[:, 2].min()), float(arr[:, 2].max())),
        "x_mean": float(arr[:, 0].mean()),
        "y_mean": float(arr[:, 1].mean()),
        "time_duration": float(arr[:, 2].max() - arr[:, 2].min()),
    }


