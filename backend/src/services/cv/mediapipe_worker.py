#!/usr/bin/env python3
"""
MediaPipe Pose Estimation Worker

This script processes video frames to extract pose landmarks, calculate joint angles,
and generate skeleton overlay frames for basketball shooting analysis.

Usage:
    python mediapipe_worker.py --frames-dir /path/to/frames --output-dir /path/to/output

Output:
    - pose_data.json: Structured pose landmarks and calculated angles
    - skeleton_*.jpg: Frames with skeleton overlay
"""

import argparse
import json
import math
import os
import sys
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
import cv2
import numpy as np

try:
    import mediapipe as mp
except ImportError:
    print("Error: mediapipe not installed. Run: pip install mediapipe", file=sys.stderr)
    sys.exit(1)

# MediaPipe setup
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Key landmark indices for basketball shooting analysis
LANDMARKS = {
    'nose': 0,
    'left_shoulder': 11,
    'right_shoulder': 12,
    'left_elbow': 13,
    'right_elbow': 14,
    'left_wrist': 15,
    'right_wrist': 16,
    'left_hip': 23,
    'right_hip': 24,
    'left_knee': 25,
    'right_knee': 26,
    'left_ankle': 27,
    'right_ankle': 28,
}


@dataclass
class Point:
    x: float
    y: float
    z: float = 0.0
    visibility: float = 0.0


@dataclass
class FramePoseData:
    frame_number: int
    landmarks: Dict[str, Point]
    elbow_angle: Optional[float] = None
    knee_flexion: Optional[float] = None
    shoulder_angle: Optional[float] = None
    body_lean: Optional[float] = None
    wrist_height_normalized: Optional[float] = None


@dataclass
class ShootingAngles:
    elbow_angle_at_release: float
    knee_flexion_at_set_point: float
    body_lean: float
    set_point_height: float
    release_frame: int
    confidence: str


def calculate_angle(a: Point, b: Point, c: Point) -> float:
    """
    Calculate the angle at point b formed by points a-b-c.
    Returns angle in degrees.
    """
    # Vectors BA and BC
    ba = (a.x - b.x, a.y - b.y)
    bc = (c.x - b.x, c.y - b.y)
    
    # Dot product
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    
    # Magnitudes
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    
    if mag_ba == 0 or mag_bc == 0:
        return 0.0
    
    # Clamp to avoid math domain errors
    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    
    return math.degrees(math.acos(cos_angle))


def calculate_body_lean(shoulder: Point, hip: Point) -> float:
    """
    Calculate body lean from vertical in degrees.
    Positive = leaning backward, Negative = leaning forward.
    """
    # Vector from hip to shoulder
    dx = shoulder.x - hip.x
    dy = shoulder.y - hip.y  # Note: y increases downward in image coordinates
    
    # Angle from vertical (vertical is dy only, no dx)
    # Using atan2 to get signed angle
    angle_from_vertical = math.degrees(math.atan2(dx, -dy))  # Negative dy because y is inverted
    
    return angle_from_vertical


def extract_landmarks_from_results(results, frame_width: int, frame_height: int) -> Optional[Dict[str, Point]]:
    """Extract key landmarks from MediaPipe results."""
    if not results.pose_landmarks:
        return None
    
    landmarks = {}
    for name, idx in LANDMARKS.items():
        lm = results.pose_landmarks.landmark[idx]
        landmarks[name] = Point(
            x=lm.x * frame_width,
            y=lm.y * frame_height,
            z=lm.z,
            visibility=lm.visibility
        )
    
    return landmarks


def analyze_frame(landmarks: Dict[str, Point], is_right_handed: bool = True) -> FramePoseData:
    """Analyze a single frame's pose data and calculate angles."""
    # Determine shooting side
    if is_right_handed:
        shoulder = landmarks['right_shoulder']
        elbow = landmarks['right_elbow']
        wrist = landmarks['right_wrist']
        hip = landmarks['right_hip']
        knee = landmarks['right_knee']
        ankle = landmarks['right_ankle']
    else:
        shoulder = landmarks['left_shoulder']
        elbow = landmarks['left_elbow']
        wrist = landmarks['left_wrist']
        hip = landmarks['left_hip']
        knee = landmarks['left_knee']
        ankle = landmarks['left_ankle']
    
    # Calculate elbow angle (shoulder-elbow-wrist)
    elbow_angle = calculate_angle(shoulder, elbow, wrist)
    
    # Calculate knee flexion (hip-knee-ankle)
    knee_flexion = calculate_angle(hip, knee, ankle)
    
    # Calculate shoulder angle (elbow-shoulder-hip)
    shoulder_angle = calculate_angle(elbow, shoulder, hip)
    
    # Calculate body lean using midpoints
    mid_shoulder = Point(
        x=(landmarks['left_shoulder'].x + landmarks['right_shoulder'].x) / 2,
        y=(landmarks['left_shoulder'].y + landmarks['right_shoulder'].y) / 2
    )
    mid_hip = Point(
        x=(landmarks['left_hip'].x + landmarks['right_hip'].x) / 2,
        y=(landmarks['left_hip'].y + landmarks['right_hip'].y) / 2
    )
    body_lean = calculate_body_lean(mid_shoulder, mid_hip)
    
    # Calculate wrist height normalized to head height
    nose = landmarks['nose']
    wrist_height_normalized = (nose.y - wrist.y) / (nose.y - mid_hip.y) if (nose.y - mid_hip.y) != 0 else 0
    
    return FramePoseData(
        frame_number=0,  # Will be set by caller
        landmarks=landmarks,
        elbow_angle=round(elbow_angle, 1),
        knee_flexion=round(knee_flexion, 1),
        shoulder_angle=round(shoulder_angle, 1),
        body_lean=round(body_lean, 1),
        wrist_height_normalized=round(wrist_height_normalized, 2)
    )


def detect_release_frame(frames_data: List[FramePoseData], is_right_handed: bool = True) -> int:
    """
    Detect the frame where the ball is released.
    This is typically when wrist height is maximum and elbow is most extended.
    """
    if not frames_data:
        return 0
    
    # Find frame with maximum wrist height (most likely release point)
    max_height = -float('inf')
    release_frame = 0
    
    for data in frames_data:
        if data.wrist_height_normalized is not None:
            if data.wrist_height_normalized > max_height:
                max_height = data.wrist_height_normalized
                release_frame = data.frame_number
    
    return release_frame


def detect_set_point_frame(frames_data: List[FramePoseData], release_frame: int) -> int:
    """
    Detect the set point frame (just before release).
    This is typically 2-3 frames before release where knee flexion is at minimum (legs straightening).
    """
    if not frames_data or release_frame == 0:
        return max(0, release_frame - 3)
    
    # Look for frame with minimum knee flexion before release
    min_knee = float('inf')
    set_point_frame = max(0, release_frame - 3)
    
    for data in frames_data:
        if data.frame_number < release_frame and data.knee_flexion is not None:
            if data.knee_flexion < min_knee:
                min_knee = data.knee_flexion
                set_point_frame = data.frame_number
    
    return set_point_frame


def calculate_shooting_angles(frames_data: List[FramePoseData]) -> ShootingAngles:
    """Calculate the key shooting angles from the pose sequence."""
    if not frames_data:
        return ShootingAngles(
            elbow_angle_at_release=0,
            knee_flexion_at_set_point=0,
            body_lean=0,
            set_point_height=0,
            release_frame=0,
            confidence="low"
        )
    
    release_frame = detect_release_frame(frames_data)
    set_point_frame = detect_set_point_frame(frames_data, release_frame)
    
    # Get data at release
    release_data = next((f for f in frames_data if f.frame_number == release_frame), frames_data[-1])
    
    # Get data at set point
    set_point_data = next((f for f in frames_data if f.frame_number == set_point_frame), frames_data[0])
    
    # Calculate average body lean across all frames
    valid_leans = [f.body_lean for f in frames_data if f.body_lean is not None]
    avg_body_lean = sum(valid_leans) / len(valid_leans) if valid_leans else 0
    
    # Determine confidence based on visibility and consistency
    confidence = "high" if len(frames_data) >= 5 else "medium" if len(frames_data) >= 3 else "low"
    
    return ShootingAngles(
        elbow_angle_at_release=release_data.elbow_angle or 0,
        knee_flexion_at_set_point=set_point_data.knee_flexion or 0,
        body_lean=round(avg_body_lean, 1),
        set_point_height=release_data.wrist_height_normalized or 0,
        release_frame=release_frame,
        confidence=confidence
    )


def draw_skeleton_on_frame(frame: np.ndarray, results, draw_angles: bool = True) -> np.ndarray:
    """Draw pose skeleton overlay on frame with optional angle annotations."""
    annotated = frame.copy()
    
    if results.pose_landmarks:
        # Draw the pose landmarks
        mp_drawing.draw_landmarks(
            annotated,
            results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing.DrawingSpec(
                color=(0, 255, 0),  # Green for landmarks
                thickness=2,
                circle_radius=4
            ),
            connection_drawing_spec=mp_drawing.DrawingSpec(
                color=(255, 255, 0),  # Yellow for connections
                thickness=2
            )
        )
    
    return annotated


def process_frames(frames_dir: str, output_dir: str, generate_skeletons: bool = True) -> Dict[str, Any]:
    """
    Process all frames in directory and extract pose data.
    
    Args:
        frames_dir: Directory containing frame images (frame-0001.jpg, etc.)
        output_dir: Directory to save skeleton frames and pose data
        generate_skeletons: Whether to generate skeleton overlay frames
    
    Returns:
        Dictionary with pose data and paths to skeleton frames
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Get sorted list of frame files
    frame_files = sorted([
        f for f in os.listdir(frames_dir) 
        if f.lower().endswith(('.jpg', '.jpeg', '.png'))
    ])
    
    if not frame_files:
        return {"error": "No frame files found", "frames_data": [], "shooting_angles": None}
    
    frames_data: List[FramePoseData] = []
    skeleton_paths: List[str] = []
    
    # Initialize MediaPipe Pose
    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=2,  # Higher accuracy
        enable_segmentation=False,
        min_detection_confidence=0.5
    ) as pose:
        
        for idx, frame_file in enumerate(frame_files):
            frame_path = os.path.join(frames_dir, frame_file)
            frame = cv2.imread(frame_path)
            
            if frame is None:
                continue
            
            height, width = frame.shape[:2]
            
            # Convert to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb_frame)
            
            # Extract landmarks
            landmarks = extract_landmarks_from_results(results, width, height)
            
            if landmarks:
                # Analyze frame
                frame_data = analyze_frame(landmarks)
                frame_data.frame_number = idx
                frames_data.append(frame_data)
                
                # Generate skeleton overlay if requested
                if generate_skeletons:
                    skeleton_frame = draw_skeleton_on_frame(frame, results)
                    skeleton_filename = f"skeleton_{idx:04d}.jpg"
                    skeleton_path = os.path.join(output_dir, skeleton_filename)
                    cv2.imwrite(skeleton_path, skeleton_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    skeleton_paths.append(skeleton_path)
    
    # Calculate shooting angles from sequence
    shooting_angles = calculate_shooting_angles(frames_data)
    
    # Prepare output
    output = {
        "frames_analyzed": len(frames_data),
        "total_frames": len(frame_files),
        "shooting_angles": asdict(shooting_angles),
        "skeleton_frame_paths": skeleton_paths,
        "frames_data": [
            {
                "frame_number": fd.frame_number,
                "elbow_angle": fd.elbow_angle,
                "knee_flexion": fd.knee_flexion,
                "shoulder_angle": fd.shoulder_angle,
                "body_lean": fd.body_lean,
                "wrist_height_normalized": fd.wrist_height_normalized
            }
            for fd in frames_data
        ]
    }
    
    # Save pose data to JSON
    pose_data_path = os.path.join(output_dir, "pose_data.json")
    with open(pose_data_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    return output


def main():
    parser = argparse.ArgumentParser(description='MediaPipe Pose Estimation for Basketball Shooting Analysis')
    parser.add_argument('--frames-dir', required=True, help='Directory containing video frames')
    parser.add_argument('--output-dir', required=True, help='Directory for output files')
    parser.add_argument('--no-skeletons', action='store_true', help='Skip skeleton frame generation')
    
    args = parser.parse_args()
    
    if not os.path.isdir(args.frames_dir):
        print(f"Error: Frames directory not found: {args.frames_dir}", file=sys.stderr)
        sys.exit(1)
    
    result = process_frames(
        frames_dir=args.frames_dir,
        output_dir=args.output_dir,
        generate_skeletons=not args.no_skeletons
    )
    
    # Output JSON to stdout for the Node.js process to capture
    print(json.dumps(result))


if __name__ == "__main__":
    main()
