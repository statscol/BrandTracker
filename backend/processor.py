import cv2
import os
import json
import time
from PIL import Image
import google.generativeai as genai
from .database import SessionLocal, Video, Detection
from thefuzz import process, fuzz

def normalize_brand_name(brand, existing_brands):
    """
    Normalize brand name using fuzzy matching.
    If 'brand' is similar (>85%) to an existing canonical brand, return the existing one.
    Otherwise, return the brand as is.
    """
    if not existing_brands:
        return brand
    
    # Simple normalization: capitalize first letter of each word
    brand = brand.strip().title()
    
    # Check for exact match first
    if brand in existing_brands:
        return brand

    # Fuzzy match
    match, score = process.extractOne(brand, existing_brands, scorer=fuzz.token_sort_ratio)
    
    if score >= 85:
        return match
    
    return brand

def process_video_task(video_id: int, file_path: str):
    db = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    
    if not video:
        return

    try:
        # Check API Key
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print(f"Error: GEMINI_API_KEY not found in environment.")
            video.status = "error"
            db.commit()
            return

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')

        video.status = "processing"
        db.commit()

        cap = cv2.VideoCapture(file_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        video.duration = duration
        db.commit()

        # Process 1 frame every second
        frame_interval = int(fps)
        if frame_interval == 0: frame_interval = 1

        current_frame = 0
        detections = []
        canonical_brands = set()

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if current_frame % frame_interval == 0:
                # Convert to PIL Image
                # OpenCV is BGR, PIL needs RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)

                timestamp = current_frame / fps
                
                # Exponential backoff retry logic
                max_retries = 5
                base_delay = 5 # Base waiting time between frames (strictly for rate limit)
                
                retry_count = 0
                while retry_count < max_retries:
                    try:
                        time.sleep(base_delay) # Wait before making request
                        
                        prompt = """
                        Identify all commercial brand logos visible in this image. 
                        - Strict rules:
                        1. Ignore generic text, stadium names, player names, scoreboards, and time.
                        2. Only list distinct commercial sponsors (e.g., Nike, Emirates, Coca-Cola).
                        3. Use the official short brand name (e.g. "FC Barcelona" -> "FC Barcelona", "Fly Emirates" -> "Emirates").
                        4. Return a JSON list of strings. Example: ["Nike", "Adidas"]. 
                        5. If no commercial brands are clearly visible, return [].
                        """

                        response = model.generate_content(
                            [prompt, pil_image],
                            generation_config={"response_mime_type": "application/json"}
                        )
                        brands = json.loads(response.text)
                        
                        if isinstance(brands, list):
                            for brand in brands:
                                if isinstance(brand, str):
                                    # Normalize
                                    normalized_brand = normalize_brand_name(brand, canonical_brands)
                                    canonical_brands.add(normalized_brand)

                                    d = Detection(
                                        video_id=video_id,
                                        text=normalized_brand,
                                        confidence=1.0, 
                                        timestamp=timestamp
                                    )
                                    detections.append(d)
                        
                        # If successful, break retry loop
                        break
                        
                    except Exception as e:
                        error_str = str(e)
                        if "429" in error_str or "Resource exhausted" in error_str:
                            retry_count += 1
                            if retry_count >= max_retries:
                                print(f"Frame at {timestamp}s failed after {max_retries} retries: {error_str}")
                                break
                            
                            wait_time = (2 ** retry_count) + 5 # 7, 9, 13, 21 seconds...
                            print(f"Rate limit hit at {timestamp}s. Retrying in {wait_time}s...")
                            time.sleep(wait_time)
                        else:
                            print(f"Frame processing error at {timestamp}s: {e}")
                            break

            current_frame += 1

        cap.release()
        
        if detections:
            db.bulk_save_objects(detections)

        video.status = "completed"
        db.commit()

    except Exception as e:
        print(f"Error processing video {video_id}: {e}")
        video.status = "error"
        db.commit()
    finally:
        db.close()
