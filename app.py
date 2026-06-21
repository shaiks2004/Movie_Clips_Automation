import os
import uuid
import subprocess
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, send_file, abort
from werkzeug.utils import secure_filename

# Load environment configurations
load_dotenv()

# Import Database connection pool and repositories
from database.connection import get_db, verify_connection
from database.repositories.users_repository import UsersRepository
from database.repositories.video_repository import VideoRepository
from database.repositories.clip_repository import ClipRepository
from database.repositories.publish_repository import PublishRepository
from database.services.pipeline_service import PipelineService

# ═══════════════════════════════════════════════════════
#  📁 FOLDER CONFIGURATION & INITIALIZATION
# ═══════════════════════════════════════════════════════
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def make_absolute(path_str):
    if not os.path.isabs(path_str):
        return os.path.abspath(os.path.join(BASE_DIR, path_str))
    return path_str

UPLOAD_DIR = make_absolute(os.getenv("UPLOAD_FOLDER", "uploads"))
OUTPUT_DIR = make_absolute(os.getenv("OUTPUT_FOLDER", "outputs"))
CLIP_DIR = make_absolute(os.getenv("CLIP_FOLDER", "clips"))
SUBTITLE_DIR = make_absolute(os.getenv("SUBTITLE_FOLDER", "subtitles"))

ALLOWED_EXT = {"mp4", "mkv", "avi", "mov", "webm"}
MAX_UPLOAD = 500 * 1024 * 1024  # 500 MB

# Create required storage directories on server startup
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CLIP_DIR, exist_ok=True)
os.makedirs(SUBTITLE_DIR, exist_ok=True)

# ═══════════════════════════════════════════════════════
#  🛠️ LOCAL FFMPEG BINARY RESOLVER
# ═══════════════════════════════════════════════════════
FFMPEG_BIN = "ffmpeg"
FFPROBE_BIN = "ffprobe"
local_ffmpeg = os.path.join(BASE_DIR, "ffmpeg.exe")
local_ffprobe = os.path.join(BASE_DIR, "ffprobe.exe")
if os.path.exists(local_ffmpeg):
    FFMPEG_BIN = local_ffmpeg
if os.path.exists(local_ffprobe):
    FFPROBE_BIN = local_ffprobe

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "clipmood_secret_default_key_1829")
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD

# ═══════════════════════════════════════════════════════
#  🛠️ PATH TRAVERSAL SAFETY & VIDEO UTILITIES
# ═══════════════════════════════════════════════════════
def safe_output_path(filename: str) -> str:
    """Validate that downloads reside securely inside clips/ or outputs/ to prevent traversals."""
    safe_name = os.path.basename(filename)
    full = os.path.realpath(os.path.join(CLIP_DIR, safe_name))
    if not full.startswith(os.path.realpath(CLIP_DIR)):
        abort(400, "Invalid filename path query.")
    return full

def get_video_duration(path: str) -> float:
    """Determines video duration using ffprobe."""
    result = subprocess.run(
        [FFPROBE_BIN, "-v", "error",
         "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1",
         path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except Exception:
        return 0.0

# Verify MongoDB availability
print(f"MongoDB Atlas Connection Status: {'CONNECTED' if verify_connection() else 'FAILED'}")

# ═══════════════════════════════════════════════════════
#  🌐 WEB ROUTES & TEMPLATES
# ═══════════════════════════════════════════════════════
@app.route("/")
def index():
    return render_template("index.html", your_email=os.getenv("YOUR_EMAIL", "sau84746@gmail.com"))

@app.route("/tool")
def tool():
    email = request.args.get("email", "").strip().lower()
    if not email or "@" not in email:
        return "Invalid email. Please register on home page first.", 400
        
    users_repo = UsersRepository()
    # Auto register user on free tier if accessing for the first time
    users_repo.register_user(email)
    premium = users_repo.is_premium(email)
    
    return render_template(
        "tool.html",
        email=email,
        is_premium=premium,
        free_limit=3,
        your_email=os.getenv("YOUR_EMAIL", "sau84746@gmail.com")
    )

# ═══════════════════════════════════════════════════════
#  📤 UPLOAD & PIPELINE EXECUTION
# ═══════════════════════════════════════════════════════
@app.route("/upload", methods=["POST"])
def upload():
    email = request.form.get("email", "").strip().lower()
    users_repo = UsersRepository()
    video_repo = VideoRepository()
    
    if not users_repo.get_user(email):
        return jsonify({"error": "User account is not registered. Access denied."}), 400
        
    if "video" not in request.files:
        return jsonify({"error": "Missing video form file parameter."}), 400
        
    f = request.files["video"]
    if not f or not f.filename:
        return jsonify({"error": "Uploaded file is empty."}), 400
        
    ext = f.filename.rsplit(".", 1)[1].lower() if "." in f.filename else ""
    if ext not in ALLOWED_EXT:
        return jsonify({"error": f"Unsupported format. Allowed: {', '.join(ALLOWED_EXT).upper()}"}), 400
        
    video_id = str(uuid.uuid4())[:8]
    filename = secure_filename(f.filename)
    save_path = os.path.join(UPLOAD_DIR, f"{video_id}_{filename}")
    
    try:
        f.save(save_path)
    except Exception as e:
        return jsonify({"error": f"Could not save uploaded video file: {e}"}), 500
        
    # Log video log document in MongoDB
    video_repo.create_video(video_id, filename, save_path, email)
    
    # Get selected mood tags
    selected_moods = request.form.getlist("moods")
    
    # Dispatch background AI content factory process
    pipeline = PipelineService()
    pipeline.start_pipeline(
        video_id=video_id,
        video_path=save_path,
        email=email,
        clip_duration=60,
        select_moods=selected_moods
    )
    
    return jsonify({"job_id": video_id})

@app.route("/status/<job_id>")
def status(job_id: str):
    video_repo = VideoRepository()
    clip_repo = ClipRepository()
    
    video = video_repo.get_video(job_id)
    if not video:
        return jsonify({"error": "Job tracking log not found."}), 404
        
    clips = clip_repo.get_clips_for_video(job_id)
    formatted = []
    for c in clips:
        formatted.append({
            "clip_id": c["clip_id"],
            "filename": c["filename"],
            "mood": c["mood"],
            "start": c["start"],
            "duration": c["duration"],
            "index": c["index"],
            "score": c.get("score", 0.0),
            "title": c["ai_content"].get("title"),
            "description": c["ai_content"].get("description"),
            "hashtags": c["ai_content"].get("hashtags", [])
        })
        
    return jsonify({
        "status": video["status"],
        "progress": video["progress"],
        "total_duration": video.get("total_duration", 0.0),
        "clips": formatted,
        "error": video.get("error")
    })

# ═══════════════════════════════════════════════════════
#  📂 CONTENT LIBRARY ENDPOINTS
# ═══════════════════════════════════════════════════════
@app.route("/api/library")
def library():
    email = request.args.get("email", "").strip().lower()
    search = request.args.get("search", "").strip()
    mood = request.args.get("mood", "").strip()
    
    clip_repo = ClipRepository()
    clips = clip_repo.get_user_clips(email)
    
    # Apply searches and filters in-memory
    filtered = []
    for c in clips:
        if mood and c.get("mood", "").lower() != mood.lower():
            continue
        if search:
            q = search.lower()
            title = c["ai_content"].get("title", "").lower()
            desc = c["ai_content"].get("description", "").lower()
            keywords = [k.lower() for k in c["ai_content"].get("keywords", [])]
            if q not in title and q not in desc and not any(q in k for k in keywords):
                continue
        filtered.append(c)
        
    # Remove MongoDB '_id' and joined 'video_info' for JSON serialization safety
    for c in filtered:
        c.pop("_id", None)
        c.pop("video_info", None)
        
    return jsonify({"clips": filtered})

@app.route("/api/clip/<clip_id>", methods=["DELETE"])
def delete_clip(clip_id: str):
    clip_repo = ClipRepository()
    clip = clip_repo.get_clip(clip_id)
    if not clip:
        return jsonify({"error": "Clip not found."}), 404
        
    # Delete local video clip file
    clip_path = os.path.join(CLIP_DIR, clip["filename"])
    if os.path.exists(clip_path):
        try:
            os.remove(clip_path)
        except Exception:
            pass
            
    # Delete associated subtitles
    for ext in [".srt", ".vtt"]:
        sub_path = os.path.join(SUBTITLE_DIR, f"{clip_id}{ext}")
        if os.path.exists(sub_path):
            try:
                os.remove(sub_path)
            except Exception:
                pass
                
    clip_repo.delete_clip(clip_id)
    return jsonify({"ok": True})

# ═══════════════════════════════════════════════════════
#  📅 PUBLISHING QUEUE ENDPOINTS
# ═══════════════════════════════════════════════════════
@app.route("/api/queue", methods=["GET", "POST"])
def queue():
    publish_repo = PublishRepository()
    
    if request.method == "POST":
        data = request.get_json() or {}
        clip_id = data.get("clip_id")
        title = data.get("title")
        description = data.get("description")
        hashtags = data.get("hashtags", [])
        platform = data.get("platform")
        schedule_time = data.get("schedule_time")
        
        if not clip_id or not platform or not schedule_time:
            return jsonify({"error": "Missing queue platform parameters."}), 400
            
        item = publish_repo.add_to_queue(
            clip_id=clip_id,
            title=title,
            description=description,
            hashtags=hashtags,
            platform=platform,
            schedule_time=schedule_time
        )
        item.pop("_id", None)
        return jsonify({"ok": True, "item": item})
        
    # GET Method
    email = request.args.get("email", "").strip().lower()
    items = publish_repo.get_queue(email)
    for it in items:
        it.pop("_id", None)
        it.pop("clip_info", None)
        it.pop("video_info", None)
        
    return jsonify({"queue": items})

@app.route("/api/queue/<queue_id>", methods=["DELETE"])
def delete_queue_item(queue_id: str):
    publish_repo = PublishRepository()
    publish_repo.delete_from_queue(queue_id)
    return jsonify({"ok": True})

# ═══════════════════════════════════════════════════════
#  📊 ANALYTICS BOARD ENDPOINT
# ═══════════════════════════════════════════════════════
@app.route("/api/analytics")
def analytics():
    email = request.args.get("email", "").strip().lower()
    video_repo = VideoRepository()
    clip_repo = ClipRepository()
    
    videos = video_repo.get_user_videos(email)
    clips = clip_repo.get_user_clips(email)
    
    # Calculate top category
    counts = {}
    for c in clips:
        m = c.get("mood")
        if m:
            counts[m] = counts.get(m, 0) + 1
    top_mood = max(counts, key=counts.get) if counts else "N/A"
    
    # Calculate total processing time estimation
    avg_proc = 45 # default benchmark
    
    return jsonify({
        "videos_count": len(videos),
        "clips_count": len(clips),
        "avg_processing_time": avg_proc,
        "top_mood": top_mood
    })

# ═══════════════════════════════════════════════════════
#  🔐 SECURITY WEBHOOKS & DOWNLOADS
# ═══════════════════════════════════════════════════════
@app.route("/download/<path:filename>")
def download(filename: str):
    # Support downloading subtitles or videos
    if filename.endswith(".srt") or filename.endswith(".vtt"):
        safe_name = os.path.basename(filename)
        full_path = os.path.realpath(os.path.join(SUBTITLE_DIR, safe_name))
        if not full_path.startswith(os.path.realpath(SUBTITLE_DIR)):
            abort(400, "Invalid subtitle download query.")
    else:
        full_path = safe_output_path(filename)
        
    if not os.path.isfile(full_path):
        return "File not found.", 404
        
    return send_file(full_path, as_attachment=True)

@app.route("/activate", methods=["POST"])
def activate():
    data = request.get_json(silent=True) or {}
    secret = os.getenv("ADMIN_SECRET", "CHANGE_ME_TO_A_RANDOM_SECRET_STRING")
    if data.get("secret") != secret:
        return jsonify({"error": "Unauthorized webhook verification."}), 403
        
    email = data.get("email", "").strip().lower()
    if not email or "@" not in email:
        return jsonify({"error": "Invalid email formatting."}), 400
        
    users_repo = UsersRepository()
    users_repo.activate_premium(email)
    return jsonify({"ok": True, "activated": email})

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File size exceeds limit. Maximum is 500 MB."}), 413

# ═══════════════════════════════════════════════════════
#  🚀 RUN & STARTUP INITS
# ═══════════════════════════════════════════════════════
# Initialize MongoDB Atlas Collection Indexes
try:
    from database.indexes import setup_indexes
    setup_indexes()
except Exception as e:
    print(f"Error configuring indexes: {e}")

if __name__ == "__main__":
    # Start background scheduler queue publisher
    try:
        from database.services.publisher_worker import start_publisher_worker
        start_publisher_worker()
    except Exception as worker_err:
        print(f"Error starting publisher worker: {worker_err}")

    print("\n[OK] ClipMood AI Content Factory running at http://localhost:5000\n")
    app.run(debug=False, host="0.0.0.0", port=5000)
