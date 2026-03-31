import pickle
import torch
from pathlib import Path
from typing import Dict, Optional
import sys

# Add parent directory to path to import SiameseLSTM modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from SiameseLSTM.model import SiameseLSTM
from api.config import MODEL_FILES, DEFAULT_MODEL, INFERENCE_DEVICE, MODEL_ARCHITECTURE


class ModelLoader:
    def __init__(self):
        """Initialize model loader with empty storage"""
        self.models: Dict[str, SiameseLSTM] = {}
        self.processors: Dict[str, object] = {}
        self.thresholds: Dict[str, float] = {}
        self.active_model: str = DEFAULT_MODEL
        
        # Determine device to use (GPU or CPU)
        if INFERENCE_DEVICE == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(INFERENCE_DEVICE)
        
        print(f"[ModelLoader] Using device: {self.device}")
    
    def load_all_models(self) -> int:
        """
        Load all trained models from disk into memory.
        
        Returns:
            int: Number of models successfully loaded
        
        Raises:
            RuntimeError: If no models are successfully loaded
        """
        print("[ModelLoader] Loading all models...")
        loaded_count = 0
        failed_count = 0
        
        for model_name, paths in MODEL_FILES.items():
            try:
                # Load model architecture
                model = SiameseLSTM(
                    input_size=MODEL_ARCHITECTURE["input_size"],
                    hidden_size=MODEL_ARCHITECTURE["hidden_size"],
                    num_layers=MODEL_ARCHITECTURE["num_layers"],
                    dropout_rate=MODEL_ARCHITECTURE["dropout_rate"],
                    dense_size=MODEL_ARCHITECTURE["dense_size"],
                    dense_dropout=MODEL_ARCHITECTURE["dense_dropout"],
                    use_attention=False
                )
                
                # Load pre-trained weights
                model_path = paths["model"]
                if not model_path.exists():
                    raise FileNotFoundError(f"Model file not found: {model_path}")
                
                state_dict = torch.load(model_path, map_location=self.device)
                model.load_state_dict(state_dict)
                model.to(self.device)
                model.eval()  # Set to evaluation mode
                
                self.models[model_name] = model
                
                # Load processor
                processor_path = paths["processor"]
                if not processor_path.exists():
                    raise FileNotFoundError(f"Processor file not found: {processor_path}")
                
                with open(processor_path, "rb") as f:
                    self.processors[model_name] = pickle.load(f)
                
                # Load threshold
                threshold_path = paths["threshold"]
                if not threshold_path.exists():
                    raise FileNotFoundError(f"Threshold file not found: {threshold_path}")
                
                with open(threshold_path, "rb") as f:
                    self.thresholds[model_name] = pickle.load(f)
                
                print(f"  ✓ {model_name}: Model, Processor, Threshold loaded")
                loaded_count += 1
                
            except Exception as e:
                print(f"  ✗ {model_name}: Failed - {str(e)}")
                failed_count += 1
                continue
        
        print(f"\n[ModelLoader] Summary: {loaded_count} loaded, {failed_count} failed")
        
        if loaded_count == 0:
            raise RuntimeError("Failed to load any models!")
        
        return loaded_count
    
    def get_active_model(self) -> Optional[SiameseLSTM]:
        """
        Get the currently active model.
        
        Returns:
            SiameseLSTM or None: The active model, or None if not loaded
        """
        return self.models.get(self.active_model)
    
    def get_active_processor(self) -> Optional[object]:
        """
        Get the processor for the currently active model.
        
        Returns:
            SignatureProcessor or None: The processor, or None if not loaded
        """
        return self.processors.get(self.active_model)
    
    def get_active_threshold(self) -> Optional[float]:
        """
        Get the verification threshold for the currently active model.
        
        Returns:
            float or None: The threshold value, or None if not loaded
        """
        return self.thresholds.get(self.active_model)
    
    def list_models(self) -> list:
        """
        List names of all loaded models.
        
        Returns:
            list: List of model combination names (e.g., ['combo_1', 'combo_2', ...])
        """
        return sorted(list(self.models.keys()))
    
    def set_active_model(self, model_name: str) -> bool:
        """
        Switch to a different loaded model.
        
        Args:
            model_name: Name of model to activate (e.g., 'combo_1')
        
        Returns:
            bool: True if successful, False if model not found
        """
        if model_name not in self.models:
            print(f"[ModelLoader] Model '{model_name}' not found. Available: {self.list_models()}")
            return False
        
        self.active_model = model_name
        print(f"[ModelLoader] Switched to active model: {self.active_model}")
        return True
    
    def get_model_info(self) -> Dict:
        """
        Get information about loaded models.
        
        Returns:
            dict: Information including total count, names, and active model
        """
        return {
            "total_models": len(self.models),
            "available_models": self.list_models(),
            "active_model": self.active_model,
            "device": str(self.device),
            "models_fully_loaded": all([
                model_name in self.models and
                model_name in self.processors and
                model_name in self.thresholds
                for model_name in self.models.keys()
            ])
        }


# Create a global instance to be imported by api/main.py
model_loader = ModelLoader()

def initialize_models() -> bool:
    """
    Initialize and load all models. Call this during API startup.
    
    Returns:
        bool: True if initialization successful, False otherwise
    """
    try:
        model_loader.load_all_models()
        info = model_loader.get_model_info()
        print(f"\n[Utils] Models initialized successfully!")
        print(f"  Total Models: {info['total_models']}")
        print(f"  Active Model: {info['active_model']}")
        print(f"  Device: {info['device']}")
        return True
    except Exception as e:
        print(f"\n[Utils] ERROR initializing models: {str(e)}")
        return False


if __name__ == "__main__":
    # Test the model loader
    print("=" * 70)
    print("TESTING MODEL LOADER")
    print("=" * 70)
    
    if initialize_models():
        print("\n" + "=" * 70)
        print("Model Information:")
        print("=" * 70)
        info = model_loader.get_model_info()
        for key, value in info.items():
            print(f"{key}: {value}")
    else:
        print("\nInitialization failed!")
