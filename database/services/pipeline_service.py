import os
import uuid
import threading
from database.repositories.video_repository import VideoRepository
from database.repositories.clip_repository import ClipRepository
from database.services.transcription_service import TranscriptionService
from database.services.scene_service import SceneService
from database.services.moment_service import MomentService
from database.services.content_engine import ContentEngine
from database.services.render_service import RenderService

class PipelineService:
    def __init__(self):
        self.video_repo = VideoRepository()
        self.clip_repo = ClipRepository()
        self.transcribe_service = TranscriptionService()
        self.scene_service = SceneService()
        self.moment_service = MomentService()
        self.content_engine = ContentEngine()
        self.render_service = RenderService()

    def start_pipeline(self, video_id: str, video_path: str, email: str, clip_duration: int, select_moods: list):
        """
        Starts the AI pipeline execution in a daemon background thread.
        """
        t = threading.Thread(
            target=self._run_pipeline,
            args=(video_id, video_path, email, clip_duration, select_moods),
            daemon=True
        )
        t.start()

    def _run_pipeline(self, video_id: str, video_path: str, email: str, clip_duration: int, select_moods: list):
        """
        Coordinates the transcription, scene cutting, moment ranking,
        clipping, and content copywriting.
        """
        try:
            # 1. Update status -> reading video parameters
            self.video_repo.update_status(video_id, status="processing", progress=5)
            
            # Resolve duration
            from app import get_video_duration # reuse duration ffprobe helper
            duration = get_video_duration(video_path)
            if duration <= 0:
                raise ValueError("Could not read video duration. Video may be corrupted or FFprobe failed.")
                
            self.video_repo.update_status(video_id, status="processing", progress=10, total_duration=duration)
            
            # 2. Transcription Engine (Whisper)
            self.video_repo.update_status(video_id, status="transcribing", progress=15)
            transcript = self.transcribe_service.transcribe(video_id, video_path)
            
            transcript_path = os.path.join(self.transcribe_service.transcripts_dir, f"{video_id}_transcript.json")
            self.video_repo.link_metadata(video_id, transcript_path=transcript_path)
            self.video_repo.update_status(video_id, status="processing", progress=30)
            
            # 3. Scene Detection Engine (Cuts)
            self.video_repo.update_status(video_id, status="detecting scenes", progress=35)
            scenes = self.scene_service.detect_scenes(video_id, duration)
            
            scenes_path = os.path.join(self.scene_service.scenes_dir, f"{video_id}_scenes.json")
            self.video_repo.link_metadata(video_id, scenes_path=scenes_path)
            self.video_repo.update_status(video_id, status="processing", progress=50)

            # 4. Moment Detection Engine (Gemini)
            self.video_repo.update_status(video_id, status="detecting moments", progress=55)
            
            from database.repositories.users_repository import UsersRepository
            is_premium = UsersRepository().is_premium(email)
            
            moments = self.moment_service.detect_moments(video_id, transcript, scenes, duration, is_premium)
            self.video_repo.update_status(video_id, status="processing", progress=70)
            
            # Filter moments matching user selection filters if active
            filtered_moments = []
            if select_moods:
                # Normalizing select moods to lower case
                select_moods_lower = [m.lower() for m in select_moods]
                for m in moments:
                    if m.get("category", "").lower() in select_moods_lower:
                        filtered_moments.append(m)
            
            # Fallback if filter left empty or not matches
            if not filtered_moments:
                filtered_moments = moments
                
            # Limit count to 20 for premium users, 3 for free users
            limit = 20 if is_premium else 3
            final_moments = filtered_moments[:limit]

            # 5. Clip Slicing & Copywriting
            self.video_repo.update_status(video_id, status="rendering clips", progress=75)
            
            rendered_clips = []
            for i, moment in enumerate(final_moments):
                clip_id = str(uuid.uuid4())[:8]
                start = moment["start_time"]
                end = moment["end_time"]
                category = moment["category"]
                score = moment["score"]
                
                # Check bounds
                if end > duration:
                    end = duration
                if start < 0:
                    start = 0.0
                    
                # Slice and burn-in subtitle overlay
                clip_filename = f"{clip_id}.mp4"
                self.render_service.render_clip(
                    video_path=video_path,
                    start=start,
                    end=end,
                    clip_id=clip_id,
                    transcript=transcript,
                    burn_subtitles=True
                )
                
                # Copywriting Title / Description / Tags using Content Engine
                meta = self.content_engine.generate_metadata(
                    transcript=transcript,
                    start=start,
                    end=end,
                    category=category,
                    index=i + 1
                )
                
                # Save clip in DB
                self.clip_repo.create_clip(
                    clip_id=clip_id,
                    video_id=video_id,
                    filename=clip_filename,
                    start=start,
                    duration=int(end - start),
                    mood=category,
                    index=i + 1,
                    score=score
                )
                
                # Update AI copy metadata
                self.clip_repo.update_ai_content(
                    clip_id=clip_id,
                    title=meta.get("title"),
                    description=meta.get("description"),
                    hashtags=meta.get("hashtags", []),
                    keywords=meta.get("keywords", [])
                )
                
                rendered_clips.append({
                    "clip_id": clip_id,
                    "filename": clip_filename,
                    "mood": category,
                    "start": start,
                    "duration": int(end - start),
                    "index": i + 1,
                    "title": meta.get("title")
                })
                
                # Incremental progress (75% to 95%)
                pct = 75 + int(((i + 1) / len(final_moments)) * 20)
                self.video_repo.update_status(video_id, status="rendering clips", progress=pct)

            # 6. Success Done
            self.video_repo.update_status(video_id, status="done", progress=100)
            
        except Exception as e:
            # Set status to error
            import traceback
            traceback.print_exc()
            self.video_repo.update_status(video_id, status="error", error=str(e))
            
        finally:
            # Cleanup uploaded source video to save server disk space
            if os.path.exists(video_path):
                try:
                    os.remove(video_path)
                    print(f"Cleanup: Removed uploaded source video file {video_path}")
                except Exception as e:
                    print(f"Error removing source video: {e}")
