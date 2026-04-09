import matplotlib.pyplot as plt
import torch
import os
import numpy as np
from sklearn.metrics import roc_curve, auc, confusion_matrix, ConfusionMatrixDisplay
from SiameseLSTM.config import device, OUTPUT_DIRECTORY

def plot_results(train_losses, val_losses, y_test, distances, predictions, test_persons, threshold):

    plt.figure(figsize=(15, 10))
    plt.suptitle(test_persons, fontsize=14, fontweight='bold')

    # Loss graph
    plt.subplot(2, 2, 1)
    plt.plot(train_losses, label='Training Loss')
    plt.plot(val_losses, label='Validation Loss')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()

    # Distance distribution
    plt.subplot(2, 2, 2)
    same_distances = distances[y_test == 0]
    diff_distances = distances[y_test == 1]

    plt.hist(same_distances, bins=30, alpha=0.7, label='Same Person', color='green')
    plt.hist(diff_distances, bins=30, alpha=0.7, label='Different Person', color='red')
    plt.axvline(x=threshold, color='blue', linestyle='--', label=f'Threshold = {threshold:.2f}')
    plt.xlabel('Distance')
    plt.ylabel('Frequency')
    plt.title('Distance Distribution')
    plt.legend()

    # ROC Curve
    plt.subplot(2, 2, 3)
    fpr, tpr, _ = roc_curve(y_test, distances)
    auc_score = auc(fpr, tpr)

    plt.plot(fpr, tpr, label=f'ROC Curve (AUC = {auc_score:.4f})')
    plt.plot([0, 1], [0, 1], 'k--', label='Random')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curve')
    plt.legend()

    # Confusion Matrix
    plt.subplot(2, 2, 4)
    ax = plt.gca()
    cm = confusion_matrix(y_test, predictions)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["Same", "Different"])
    disp.plot(cmap=plt.cm.Blues, ax=ax)
    plt.title("Confusion Matrix")
    plt.show()
    
    filename = "_".join(test_persons) + ".png" if isinstance(test_persons, list) else str(test_persons) + ".png"
    save_path = os.path.join(OUTPUT_DIRECTORY,"test_results", filename)
    plt.tight_layout(rect=[0, 0, 1, 0.96])
    plt.savefig(save_path)


def find_optimal_threshold_roc(all_distances, all_labels, target_fpr=0.01):
    """
    Find optimal threshold using ROC curve analysis with smart fallback.
    """
    from sklearn.metrics import f1_score
    
    # Compute ROC curve
    fpr, tpr, thresholds = roc_curve(all_labels, all_distances)
    roc_auc = auc(fpr, tpr)
    
    # Separate distance distributions
    same_distances = all_distances[all_labels == 0]
    diff_distances = all_distances[all_labels == 1]
    
    mean_same = np.mean(same_distances)
    mean_diff = np.mean(diff_distances)
    separation = abs(mean_diff - mean_same)
    
    # Method 1: Try to find threshold for target FPR
    valid_idx = np.where(fpr <= target_fpr)[0]
    use_method = None
    optimal_threshold = None
    
    if len(valid_idx) > 0:
        # Found a threshold that meets target FPR
        optimal_idx = valid_idx[np.argmax(tpr[valid_idx])]
        candidate_threshold = thresholds[optimal_idx]
        
        # Check if this threshold is sensible
        test_predictions = (all_distances > candidate_threshold).astype(int)
        num_positive_predictions = np.sum(test_predictions)
        num_negative_predictions = len(test_predictions) - num_positive_predictions
        
        # Sanity checks:
        # 1. Must make both positive and negative predictions
        # 2. Threshold should be between the distribution means (roughly)
        # 3. Distributions must be reasonably separated
        # 4. Same person should be closer (mean_same < mean_diff)
        
        is_valid_predictions = (num_positive_predictions > 0 and num_negative_predictions > 0)
        is_reasonable_threshold = (
            min(same_distances.max(), diff_distances.max()) >= candidate_threshold >= 
            max(same_distances.min(), diff_distances.min()) and
            separation >= 0.15  # Distributions must be at least 0.15 apart
        )
        is_correct_order = (mean_same < mean_diff)  # Same person closer than different
        
        if is_valid_predictions and is_reasonable_threshold and is_correct_order:
            optimal_threshold = candidate_threshold
            use_method = "ROC-FPR-Optimized"
    
    # Method 2 (Fallback): Use F1-score optimization if ROC didn't work
    if use_method is None:
        f1_scores = []
        finite_thresholds = []
        
        for i, thresh in enumerate(thresholds):
            if not np.isfinite(thresh):
                continue  # Skip infinite thresholds
            
            predictions = (all_distances > thresh).astype(int)
            tp = np.sum((predictions == 1) & (all_labels == 1))
            fp = np.sum((predictions == 1) & (all_labels == 0))
            fn = np.sum((predictions == 0) & (all_labels == 1))
            tn = np.sum((predictions == 0) & (all_labels == 0))
            
            # Only consider thresholds that make both positive and negative predictions
            if np.sum(predictions) > 0 and np.sum(predictions) < len(predictions):
                precision = tp / (tp + fp) if (tp + fp) > 0 else 0
                recall = tp / (tp + fn) if (tp + fn) > 0 else 0
                f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
                f1_scores.append(f1)
                finite_thresholds.append(thresh)
        
        if len(f1_scores) > 0:
            f1_scores = np.array(f1_scores)
            best_f1_idx = np.argmax(f1_scores)
            optimal_threshold = finite_thresholds[best_f1_idx]
            use_method = "F1-Optimized"
        else:
            optimal_threshold = (mean_same + mean_diff) / 2
            use_method = "Midpoint-Fallback"
    
    # Ensure threshold is finite and sensible
    if not np.isfinite(optimal_threshold) or optimal_threshold is None:
        optimal_threshold = (mean_same + mean_diff) / 2
        use_method = "Fallback-Finite"
    
    predictions = (all_distances > optimal_threshold).astype(int)
    
    # Find closest threshold in ROC array
    closest_idx = np.argmin(np.abs(thresholds - optimal_threshold))
    optimal_fpr = fpr[closest_idx]
    optimal_tpr = tpr[closest_idx]
    
    # Calculate metrics
    from sklearn.metrics import f1_score
    tp = np.sum((predictions == 1) & (all_labels == 1))
    fp = np.sum((predictions == 1) & (all_labels == 0))
    fn = np.sum((predictions == 0) & (all_labels == 1))
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    optimal_f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    metrics = {
        'auc': roc_auc,
        'fpr': optimal_fpr,
        'tpr': optimal_tpr,
        'f1': optimal_f1,
        'threshold': optimal_threshold,
        'method': use_method,
        'same_mean': np.mean(same_distances),
        'same_std': np.std(same_distances),
        'diff_mean': np.mean(diff_distances),
        'diff_std': np.std(diff_distances),
        'precision': precision,
        'recall': recall
    }
    
    return optimal_threshold, optimal_fpr, optimal_tpr, metrics, fpr, tpr, thresholds


def plot_training_distance_distribution(model, train_loader, combination_idx, use_roc_optimization=True):
    """
    Plots the distance distribution for training data and calculates threshold.
    Uses ROC curve optimization for better false positive control.
    
    Args:
        model: Trained Siamese LSTM model
        train_loader: DataLoader for training data
        combination_idx: Index of the current combination for file naming
        use_roc_optimization: If True, use ROC-based threshold; if False, use simple midpoint
    
    Returns:
        threshold: Calculated threshold value (optimized)
    """
    print("\nCalculating distance distribution on training data...")
    model.eval()
    all_distances = []
    all_labels = []

    with torch.no_grad():
        for sig1, sig2, labels in train_loader:
            sig1, sig2, labels = sig1.to(device), sig2.to(device), labels.to(device)
            distances = model(sig1, sig2)
            distances = distances.cpu().numpy()
            labels = labels.cpu().numpy()
            all_distances.extend(distances)
            all_labels.extend(labels)

    all_distances = np.array(all_distances)
    all_labels = np.array(all_labels)
    
    same_distances = all_distances[all_labels == 0]
    diff_distances = all_distances[all_labels == 1]

    # Calculate threshold using chosen method
    if use_roc_optimization:
        threshold, fpr, tpr, metrics, fpr_curve, tpr_curve, thresholds = find_optimal_threshold_roc(
            all_distances, all_labels, target_fpr=0.01
        )
        print(f"\n✓ {metrics['method']} Threshold Calculation:")
        print(f"  Threshold: {threshold:.4f}")
        print(f"  Target FPR: 1.0%, Achieved FPR: {fpr*100:.2f}%")
        print(f"  TPR (recall): {tpr*100:.2f}%")
        print(f"  Precision: {metrics['precision']*100:.2f}%")
        print(f"  F1-Score: {metrics['f1']:.4f}")
        print(f"  AUC: {metrics['auc']:.4f}")
    else:
        threshold = (np.mean(same_distances) + np.mean(diff_distances)) / 2
        print(f"\n✓ Simple Midpoint Threshold: {threshold:.4f}")

    # Create comprehensive visualization
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle(f'Combination {combination_idx + 1} - Threshold Analysis', fontsize=14, fontweight='bold')

    # Distance distribution
    axes[0, 0].hist(same_distances, bins=30, alpha=0.7, label='Same Person', color='green')
    axes[0, 0].hist(diff_distances, bins=30, alpha=0.7, label='Different Person', color='red')
    axes[0, 0].axvline(x=threshold, color='blue', linestyle='--', linewidth=2, label=f'Threshold = {threshold:.4f}')
    axes[0, 0].set_xlabel('Distance')
    axes[0, 0].set_ylabel('Frequency')
    axes[0, 0].set_title('Distance Distribution (Training Data)')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)

    # ROC Curve
    if use_roc_optimization:
        axes[0, 1].plot(fpr_curve, tpr_curve, 'b-', linewidth=2, label=f'ROC Curve (AUC = {metrics["auc"]:.4f})')
        axes[0, 1].plot([0, 1], [0, 1], 'k--', linewidth=1, label='Random Classifier')
        axes[0, 1].plot(fpr, tpr, 'ro', markersize=8, label=f'Optimal Point (FPR={fpr*100:.2f}%)')
        axes[0, 1].set_xlabel('False Positive Rate')
        axes[0, 1].set_ylabel('True Positive Rate')
        axes[0, 1].set_title('ROC Curve')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
    else:
        axes[0, 1].text(0.5, 0.5, 'ROC Optimization Disabled', ha='center', va='center', fontsize=12)
        axes[0, 1].set_title('ROC Curve (Disabled)')

    # Statistics panel
    stats_text = (
        f"Same Person Signatures:\n"
        f"  Mean: {np.mean(same_distances):.4f}\n"
        f"  Std: {np.std(same_distances):.4f}\n"
        f"  Min: {np.min(same_distances):.4f}\n"
        f"  Max: {np.max(same_distances):.4f}\n\n"
        f"Different Person Signatures:\n"
        f"  Mean: {np.mean(diff_distances):.4f}\n"
        f"  Std: {np.std(diff_distances):.4f}\n"
        f"  Min: {np.min(diff_distances):.4f}\n"
        f"  Max: {np.max(diff_distances):.4f}\n\n"
        f"Selected Threshold: {threshold:.4f}\n"
    )
    if use_roc_optimization:
        stats_text += (
            f"Method: {metrics['method']}\n"
            f"FPR at threshold: {fpr*100:.2f}%\n"
            f"TPR at threshold: {tpr*100:.2f}%\n"
            f"Precision: {metrics['precision']*100:.2f}%\n"
            f"F1-Score: {metrics['f1']:.4f}\n"
            f"AUC: {metrics['auc']:.4f}"
        )
    
    axes[1, 0].text(0.1, 0.5, stats_text, fontsize=10, family='monospace',
                    verticalalignment='center', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    axes[1, 0].axis('off')

    # Predictions plot
    predictions = (all_distances > threshold).astype(int)
    tp = np.sum((predictions == 1) & (all_labels == 1))
    tn = np.sum((predictions == 0) & (all_labels == 0))
    fp = np.sum((predictions == 1) & (all_labels == 0))
    fn = np.sum((predictions == 0) & (all_labels == 1))
    
    cm = np.array([[tn, fp], [fn, tp]])
    im = axes[1, 1].imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    axes[1, 1].figure.colorbar(im, ax=axes[1, 1])
    
    classes = ['Same Person', 'Different Person']
    tick_marks = np.arange(len(classes))
    axes[1, 1].set_xticks(tick_marks)
    axes[1, 1].set_yticks(tick_marks)
    axes[1, 1].set_xticklabels(classes)
    axes[1, 1].set_yticklabels(classes)
    
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            axes[1, 1].text(j, i, format(cm[i, j], 'd'),
                           ha="center", va="center",
                           color="white" if cm[i, j] > thresh else "black")
    
    axes[1, 1].set_ylabel('True Label')
    axes[1, 1].set_xlabel('Predicted Label')
    axes[1, 1].set_title('Confusion Matrix (Training Data)')
    
    plt.tight_layout()
    save_path = os.path.join(OUTPUT_DIRECTORY, "train_results", f'distance_distribution_combination_{combination_idx + 1}.png')
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.show()
    
    return threshold
