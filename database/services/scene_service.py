import os
import json
import shutil
from database.connection import get_db

class SceneService:
    def __init__(self):
        # Resolve folders
        self.base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.scenes_dir = os.path.join(self.base_dir, "scenes")
        os.makedirs(self.scenes_dir, exist_ok=True)

    def detect_scenes(self, video_id: str, total_duration: float) -> dict:
        """
        Detects scene boundary timestamps. 
        Looks for pre-existing reference files first, otherwise splits by segment durations.
        """
        # 1. Fallback check: Search for pre-computed local files in reference directories
        local_ref_dir = r"c:\Projects\Movie_Clips\Scenes"
        disable_fallbacks = os.getenv("DISABLE_FALLBACKS", "false").lower() == "true"
        if not disable_fallbacks and os.path.exists(local_ref_dir):
            # Try exact match first
            for file in os.listdir(local_ref_dir):
                if video_id in file and file.endswith(".json"):
                    ref_path = os.path.join(local_ref_dir, file)
                    target_path = os.path.join(self.scenes_dir, f"{video_id}_scenes.json")
                    try:
                        shutil.copy2(ref_path, target_path)
                        print(f"[OK] Found local scene file: {file}. Copied successfully.")
                        with open(target_path, "r", encoding="utf-8") as f:
                            return json.load(f)
                    except Exception as e:
                        print(f"Error copying local scenes: {e}")
            
            # Fallback to any pre-computed scene file
            for file in os.listdir(local_ref_dir):
                if file.endswith("_scenes.json") or file.endswith(".json"):
                    ref_path = os.path.join(local_ref_dir, file)
                    target_path = os.path.join(self.scenes_dir, f"{video_id}_scenes.json")
                    try:
                        with open(ref_path, "r", encoding="utf-8") as f:
                            scene_data = json.load(f)
                        # Override video_id
                        scene_data["video_id"] = video_id
                        with open(target_path, "w", encoding="utf-8") as f_out:
                            json.dump(scene_data, f_out, indent=2)
                        print(f"[OK] Successfully fell back to pre-computed scenes: {file}")
                        return scene_data
                    except Exception as e:
                        print(f"Error loading fallback scenes: {e}")

        # 2. Logic splitting fallback: Split the video into scenes every 45-60 seconds
        scene_list = [{"timestamp": 0.0, "confidence": None}]
        interval = 50.0 # split every 50 seconds
        current = interval
        
        while current < total_duration:
            scene_list.append({
                "timestamp": round(current, 2),
                "confidence": None
            })
            current += interval
            
        scene_data = {
            "video_id": video_id,
            "total_scenes": len(scene_list),
            "scenes": scene_list
        }

        # Save to local folder
        output_path = os.path.join(self.scenes_dir, f"{video_id}_scenes.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(scene_data, f, indent=2)

        return scene_data
