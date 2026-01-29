from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import shutil
import os
import uuid
from .database import SessionLocal, Video, Detection, init_db
from .processor import process_video_task
import yt_dlp
from pydantic import BaseModel

class UrlInput(BaseModel):
    url: str

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    init_db()

UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Create unique filename
    file_id = str(uuid.uuid4())
    extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{file_id}{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create DB entry
    db_video = Video(filename=file.filename, filepath=file_path, status="pending")
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    # Trigger background processing
    background_tasks.add_task(process_video_task, db_video.id, file_path)

    return {"id": db_video.id, "filename": db_video.filename, "status": "pending"}

@app.post("/upload-url")
def upload_url(background_tasks: BackgroundTasks, item: UrlInput, db: Session = Depends(get_db)):
    try:
        ydl_opts = {
            'format': 'best[ext=mp4]/best', # Prefer mp4 for cv2 compatibility
            'outtmpl': os.path.join(UPLOAD_DIR, '%(id)s.%(ext)s'),
            'noplaylist': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info first
            info = ydl.extract_info(item.url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Create DB entry
            # filename is absolute or relative? yt-dlp returns what's in outtmpl usually?
            # We want just the basename for display, and path for processing.
            display_name = info.get('title', 'YouTube Video')
            
            db_video = Video(filename=display_name, filepath=filename, status="pending")
            db.add(db_video)
            db.commit()
            db.refresh(db_video)

            # Trigger background processing
            background_tasks.add_task(process_video_task, db_video.id, filename)

            return {"id": db_video.id, "filename": db_video.filename, "status": "pending"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/videos/{video_id}")
def get_video_status(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {
        "id": video.id,
        "filename": video.filename,
        "status": video.status,
        "duration": video.duration
    }

@app.get("/videos/{video_id}/report")
def get_video_report(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.status != "completed":
        return {"status": video.status, "message": "Processing not complete"}

    # Aggregate detections
    detections = db.query(Detection).filter(Detection.video_id == video_id).all()
    
    # Simple grouping by text
    stats = {}
    for d in detections:
        text = d.text.upper().strip()
        if text not in stats:
            stats[text] = {"count": 0, "timestamps": []}
        stats[text]["count"] += 1
        stats[text]["timestamps"].append(d.timestamp)

    # Calculate approximate duration (assuming 1 detection per sampled frame interval)
    # If we sample every 1 second, count = seconds.
    # Check processor.py for sample rate.
    
    report = []
    sample_rate_sec = 1.0 # This should match processor.py
    
    for text, data in stats.items():
        # A simple estimation: count * sample_rate
        # For more precision, we'd look at continuity. 
        duration = data["count"] * sample_rate_sec
        report.append({
            "sponsor": text,
            "detections": data["count"],
            "duration_seconds": duration,
            "first_appearance": min(data["timestamps"]) if data["timestamps"] else 0
        })

    # Sort by duration
    report.sort(key=lambda x: x["duration_seconds"], reverse=True)

    return {"video_id": video_id, "status": "completed", "sponsors": report}
