import os
import subprocess
from datetime import timedelta
from database.connection import get_db

class RenderService:
    def __init__(self):
        # Resolve folders
        self.base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.clips_dir = os.path.join(self.base_dir, "clips")
        self.subtitles_dir = os.path.join(self.base_dir, "subtitles")
        
        os.makedirs(self.clips_dir, exist_ok=True)
        os.makedirs(self.subtitles_dir, exist_ok=True)

        # Local FFmpeg / FFprobe bin paths
        self.ffmpeg_bin = "ffmpeg"
        self.ffprobe_bin = "ffprobe"
        local_ffmpeg = os.path.join(self.base_dir, "ffmpeg.exe")
        local_ffprobe = os.path.join(self.base_dir, "ffprobe.exe")
        if os.path.exists(local_ffmpeg):
            self.ffmpeg_bin = local_ffmpeg
        if os.path.exists(local_ffprobe):
            self.ffprobe_bin = local_ffprobe

    def render_clip(self, video_path: str, start: float, end: float, clip_id: str, 
                    transcript: dict, burn_subtitles: bool = True) -> str:
        """
        Slices the video from start to end, generates SRT/VTT subtitle files,
        and optionally burns subtitles into the output video.
        Returns the absolute filepath of the generated clip.
        """
        duration = int(end - start)
        clip_filename = f"{clip_id}.mp4"
        clip_path = os.path.join(self.clips_dir, clip_filename)
        
        # 1. Generate SRT and VTT subtitle files for the clip duration range
        srt_path, vtt_path = self.generate_subtitles(video_id=clip_id, start=start, end=end, transcript=transcript)

        # 2. Slice and burn-in subtitles
        if burn_subtitles and os.path.exists(srt_path):
            # Windows FFmpeg path escaping: Use relative path by setting CWD or escaping path
            # We will copy the SRT file temporarily to the current directory or format the path carefully.
            # A simple way to burn subtitles in FFmpeg on Windows:
            # We can format the filter argument with escaped backslashes and colons:
            # subtitles='C\:\\path\\to\\sub.srt'
            escaped_srt = srt_path.replace(":", "\\:").replace("\\", "/")
            filter_arg = f"subtitles='{escaped_srt}':force_style='Fontname=Oswald,Fontsize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000'"
            
            result = subprocess.run([
                self.ffmpeg_bin, "-y",
                "-ss", str(round(start, 2)),
                "-i", video_path,
                "-t", str(duration),
                "-vf", filter_arg,
                "-c:v", "libx264", "-c:a", "aac",
                "-preset", "veryfast",
                "-movflags", "+faststart",
                clip_path
            ], capture_output=True)
            
            if result.returncode == 0 and os.path.exists(clip_path) and os.path.getsize(clip_path) > 1024:
                return clip_path

        # 3. Fallback: Fast stream-copy (without subtitles) or if subtitles burn failed
        fast = subprocess.run([
            self.ffmpeg_bin, "-y",
            "-ss", str(round(start, 2)),
            "-i", video_path,
            "-t", str(duration),
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            "-movflags", "+faststart",
            clip_path
        ], capture_output=True)

        if fast.returncode == 0 and os.path.exists(clip_path) and os.path.getsize(clip_path) > 1024:
            return clip_path

        # 4. Fallback 2: Re-encode without subtitles if stream-copy fails
        result = subprocess.run([
            self.ffmpeg_bin, "-y",
            "-ss", str(round(start, 2)),
            "-i", video_path,
            "-t", str(duration),
            "-c:v", "libx264", "-c:a", "aac",
            "-preset", "veryfast",
            "-movflags", "+faststart",
            clip_path
        ], capture_output=True)
        
        if result.returncode == 0 and os.path.exists(clip_path):
            return clip_path
            
        raise RuntimeError(f"FFmpeg failed to render clip: {result.stderr.decode('utf-8', errors='ignore')}")

    def generate_subtitles(self, video_id: str, start: float, end: float, transcript: dict) -> tuple:
        """
        Extracts transcript segments fitting in the clip's timestamp range,
        shifts segment timings so they align from 0.0s, and generates SRT and WebVTT outputs.
        """
        srt_path = os.path.join(self.subtitles_dir, f"{video_id}.srt")
        vtt_path = os.path.join(self.subtitles_dir, f"{video_id}.vtt")

        segments = transcript.get("segments", [])
        srt_lines = []
        vtt_lines = ["WEBVTT\n"]
        
        idx = 1
        for seg in segments:
            # Check overlap
            s_time = seg["start_time"]
            e_time = seg["end_time"]
            if s_time >= (start - 0.5) and e_time <= (end + 0.5):
                # Shift timings relative to clip start
                shifted_start = max(0.0, s_time - start)
                shifted_end = min(end - start, e_time - start)
                
                # Format to SRT time syntax (HH:MM:SS,mmm)
                srt_start_str = self._format_timestamp(shifted_start, comma=True)
                srt_end_str = self._format_timestamp(shifted_end, comma=True)
                
                srt_lines.append(f"{idx}\n{srt_start_str} --> {srt_end_str}\n{seg['text']}\n")
                
                # Format to VTT time syntax (HH:MM:SS.mmm)
                vtt_start_str = self._format_timestamp(shifted_start, comma=False)
                vtt_end_str = self._format_timestamp(shifted_end, comma=False)
                
                vtt_lines.append(f"\n{idx}\n{vtt_start_str} --> {vtt_end_str}\n{seg['text']}")
                idx += 1
                
        # Write SRT
        with open(srt_path, "w", encoding="utf-8") as f:
            f.writelines(srt_lines)
            
        # Write VTT
        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(vtt_lines))
            
        return srt_path, vtt_path

    def _format_timestamp(self, seconds: float, comma: bool = True) -> str:
        """
        Converts seconds to HH:MM:SS,mmm or HH:MM:SS.mmm string formatting.
        """
        td = timedelta(seconds=seconds)
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds_part = divmod(remainder, 60)
        milliseconds = int(td.microseconds / 1000)
        
        sep = "," if comma else "."
        return f"{hours:02d}:{minutes:02d}:{seconds_part:02d}{sep}{milliseconds:03d}"
