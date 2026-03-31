"""
Hand detection module using MediaPipe for camera frame processing.
Detects hand landmarks and extracts signature points based on finger positions.
"""

import cv2
import mediapipe as mp
import numpy as np
import math as mt
from typing import Dict, Optional, List, Tuple

# Configuration constants (matching record_signatures.py)
DIST_MAX = 80  # pixels - threshold for finger separation to start capturing
SIGNATURE_AREA_P1 = (100, 100)
SIGNATURE_AREA_P2 = (540, 350)


class HandDetector:
    """Detects hand landmarks and extracts signature points from video frames."""
    
    def __init__(self):
        """Initialize MediaPipe hand detection."""
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
    
    def process_frame(self, frame_data: np.ndarray) -> Dict:
        """
        Process a video frame and detect hand landmarks.
        
        Args:
            frame_data: numpy array of video frame (BGR format)
        
        Returns:
            Dictionary containing:
            - detected: bool - whether hand was detected
            - index_finger: [x, y] or None
            - middle_finger: [x, y] or None
            - finger_distance: float - distance between fingers in pixels
            - in_signature_area: bool - whether fingers are in bounding box
            - landmarks: list of all hand landmarks
        """
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame_data, cv2.COLOR_BGR2RGB)
        
        # Process frame with MediaPipe
        results = self.hands.process(rgb_frame)
        
        result = {
            'detected': False,
            'index_finger': None,
            'middle_finger': None,
            'finger_distance': 0,
            'in_signature_area': False,
            'landmarks': None,
            'handedness': None
        }
        
        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            handedness = results.multi_handedness[0].classification[0].label
            
            height, width = frame_data.shape[:2]
            
            # Get index and middle finger tips (landmarks 8 and 12)
            index_landmark = hand_landmarks.landmark[self.mp_hands.HandLandmark.INDEX_FINGER_TIP]
            middle_landmark = hand_landmarks.landmark[self.mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
            
            index_x = int(index_landmark.x * width)
            index_y = int(index_landmark.y * height)
            middle_x = int(middle_landmark.x * width)
            middle_y = int(middle_landmark.y * height)
            
            # Calculate distance between fingers
            finger_distance = mt.sqrt(mt.pow(index_x - middle_x, 2) + mt.pow(index_y - middle_y, 2))
            
            # Check if in signature area
            in_signature_area = (
                SIGNATURE_AREA_P1[0] < index_x < SIGNATURE_AREA_P2[0] and
                SIGNATURE_AREA_P1[1] < index_y < SIGNATURE_AREA_P2[1]
            )
            
            # Convert all landmarks to pixel coordinates
            landmarks = []
            for landmark in hand_landmarks.landmark:
                x = int(landmark.x * width)
                y = int(landmark.y * height)
                landmarks.append([x, y])
            
            result = {
                'detected': True,
                'index_finger': [index_x, index_y],
                'middle_finger': [middle_x, middle_y],
                'finger_distance': float(finger_distance),
                'in_signature_area': in_signature_area,
                'landmarks': landmarks,
                'handedness': handedness
            }
        
        return result
    
    def should_capture_point(self, hand_data: Dict) -> bool:
        """
        Determine if current finger position should be captured as a signature point.
        
        Args:
            hand_data: Dictionary from process_frame()
        
        Returns:
            bool - True if fingers are apart enough and in signature area
        """
        if not hand_data['detected']:
            return False
        
        return (
            hand_data['finger_distance'] > DIST_MAX and
            hand_data['in_signature_area']
        )
    
    def get_capture_point(self, hand_data: Dict) -> Optional[Tuple[int, int]]:
        """
        Get the capture point (index finger position) if conditions are met.
        
        Args:
            hand_data: Dictionary from process_frame()
        
        Returns:
            Tuple of (x, y) coordinates or None if not capturing
        """
        if self.should_capture_point(hand_data):
            return tuple(hand_data['index_finger'])
        return None


# Global hand detector instance
hand_detector = None


def initialize_hand_detector():
    """Initialize the global hand detector instance."""
    global hand_detector
    hand_detector = HandDetector()
    print("✓ Hand detector initialized")


def get_hand_detector() -> HandDetector:
    """Get or create the global hand detector instance."""
    global hand_detector
    if hand_detector is None:
        initialize_hand_detector()
    return hand_detector
