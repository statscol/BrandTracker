from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///./marktracker.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    filepath = Column(String)
    status = Column(String, default="pending") # pending, processing, completed, error
    duration = Column(Float, default=0.0)

    detections = relationship("Detection", back_populates="video")

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
    text = Column(String, index=True)
    confidence = Column(Float)
    timestamp = Column(Float) # Time in video when detected

    video = relationship("Video", back_populates="detections")

def init_db():
    Base.metadata.create_all(bind=engine)
