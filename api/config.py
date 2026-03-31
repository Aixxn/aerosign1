import os
from pathlib import Path

# ============================================================================
# PROJECT PATHS
# ============================================================================

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Training outputs directory
TRAINING_OUTPUTS = PROJECT_ROOT / "training_outputs"

# Model-related directories
MODELS_DIR = TRAINING_OUTPUTS / "models"
PROCESSORS_DIR = TRAINING_OUTPUTS / "processors"
THRESHOLDS_DIR = TRAINING_OUTPUTS / "thresholds"

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================

# Number of trained model combinations (leave-two-out validation)
MODEL_COMBINATIONS = 6

# Model file paths - dynamically generated for all combinations
MODEL_FILES = {
    f"combo_{i}": {
        "model": MODELS_DIR / f"siamese_lstm_pytorch_combination_{i}.pth",
        "processor": PROCESSORS_DIR / f"signature_processor_pytorch_combination_{i}.pkl",
        "threshold": THRESHOLDS_DIR / f"optimal_threshold_pytorch_combination_{i}.pkl",
    }
    for i in range(1, MODEL_COMBINATIONS + 1)
}

# Default model to use on startup
DEFAULT_MODEL = "combo_1"

# ============================================================================
# SIAMESE LSTM MODEL ARCHITECTURE PARAMETERS
# ============================================================================

MODEL_ARCHITECTURE = {
    "input_size": 3,              # X, Y, time coordinates
    "hidden_size": 128,           # LSTM hidden units
    "num_layers": 2,              # LSTM layers (bidirectional)
    "dropout_rate": 0.3,          # LSTM dropout rate
    "dense_size": 128,            # First dense layer size
    "dense_dropout": 0.2,         # Dense layer dropout
}

# ============================================================================
# API SERVER CONFIGURATION
# ============================================================================

# Server host and port
API_HOST = "0.0.0.0"
API_PORT = 8000

# Debug mode (set to False in production)
DEBUG = False

CORS_ORIGINS = [
    "http://localhost:3000",      # React development server (default)
    "http://127.0.0.1:3000",
]



MIN_SIGNATURE_POINTS = 5


MAX_SIGNATURE_POINTS = 1000

INFERENCE_DEVICE = "auto"  # "auto", "cuda", or "cpu"


LOG_LEVEL = "INFO"
LOG_FILE = PROJECT_ROOT / "logs" / "aerosign_api.log"



def validate_model_files():
    """Validate that all required model files exist"""
    missing_files = []
    
    for combo_name, paths in MODEL_FILES.items():
        for file_type, file_path in paths.items():
            if not file_path.exists():
                missing_files.append(f"{combo_name}/{file_type}: {file_path}")
    
    return missing_files

def get_model_info():
    """Get summary of available models"""
    return {
        "total_models": len(MODEL_FILES),
        "models": list(MODEL_FILES.keys()),
        "default_model": DEFAULT_MODEL,
        "model_root": str(TRAINING_OUTPUTS),
    }

if __name__ == "__main__":

    print("AEROSIGN API CONFIGURATION")
    print(f"\nProject Root: {PROJECT_ROOT}")
    print(f"Training Outputs: {TRAINING_OUTPUTS}")
    print(f"\nServer: {API_HOST}:{API_PORT}")
    print(f"Debug Mode: {DEBUG}")
    print(f"\nModel Architecture:")
    for key, value in MODEL_ARCHITECTURE.items():
        print(f"  {key}: {value}")
    print(f"\nAvailable Models: {len(MODEL_FILES)}")
    print(f"Default Model: {DEFAULT_MODEL}")
    
    missing = validate_model_files()
    if missing:
        print(f"\n WARNING: Missing model files:")
        for file in missing:
            print(f"   - {file}")
    else:
        print("\n✓ All model files present")
