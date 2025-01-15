import asyncio
import base64
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import logging
import os  # Added import to access environment variables

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

KNOWN_DISTANCE = 0.45  
KNOWN_WIDTH = 0.15 

async def get_camera():
    logger.info("Attempting to initialize camera...")
    for i in range(5):  # Try 5 times
        for index in range(5):  # Check up to 5 indexes
            camera = cv2.VideoCapture(index)
            if camera.isOpened():
                logger.info(f"Camera successfully opened at index {index} on attempt {i+1}")
                ret, frame = camera.read()
                if ret:
                    logger.info("Successfully read a frame from the camera")
                    return camera
                else:
                    logger.warning(f"Camera opened but couldn't read a frame at index {index}")
            else:
                logger.warning(f"Failed to open camera at index {index} on attempt {i+1}")
        await asyncio.sleep(1)  # Wait before retrying
    raise RuntimeError("Could not start camera after 5 attempts.")

async def calibrate(camera, websocket):
    await websocket.send_json({"calibrationStatus": "Calibration started", "progress": 0})
    focal_length = None
    total_frames = 30
    for i in range(total_frames):
        ret, frame = camera.read()
        if not ret:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))
        if len(faces) > 0:
            (x, y, w, h) = faces[0]
            focal_length = (w * KNOWN_DISTANCE) / KNOWN_WIDTH
            progress = ((i + 1) / total_frames) * 100
            await websocket.send_json({
                "calibrationStatus": f"Calibrating... {progress:.0f}%",
                "progress": progress
            })
            await asyncio.sleep(0.05) 
        else:
            await websocket.send_json({
                "calibrationStatus": f"Calibrating... {((i + 1) / total_frames * 100):.0f}%",
                "progress": ((i + 1) / total_frames) * 100
            })
            await asyncio.sleep(0.05) 
    
    if focal_length is None:
        await websocket.send_json({"calibrationStatus": "Calibration failed. No face detected.", "progress": 100})
        raise Exception("Calibration failed. No face detected.")
    
    await websocket.send_json({
        "calibrationStatus": f"Calibration complete. Focal length: {focal_length:.2f}",
        "progress": 100
    })
    await asyncio.sleep(0.5)  
    return focal_length

def detect_face_and_distance(frame, focal_length):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) > 0:
        (x, y, w, h) = faces[0]
        distance = (KNOWN_WIDTH * focal_length) / w
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, f"{distance:.2f}m", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)
        return distance, frame
    return None, frame

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        camera = await get_camera()
        await websocket.send_json({"message": "Camera initialized"})
        
        focal_length = await calibrate(camera, websocket)
        
        while True:
            ret, frame = camera.read()
            if not ret:
                logger.error("Failed to capture frame")
                await websocket.send_json({"error": "Failed to capture frame"})
                break
            
            distance, processed_frame = detect_face_and_distance(frame, focal_length)
            
            _, buffer = cv2.imencode('.jpg', processed_frame)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            await websocket.send_json({
                "image": jpg_as_text,
                "distance": distance if distance is not None else -1
            })
            
            await asyncio.sleep(0.1)
    except Exception as e:
        logger.error(f"Error in websocket connection: {str(e)}")
        await websocket.send_json({"error": str(e)})
    finally:
        if 'camera' in locals():
            camera.release()
        logger.info("WebSocket connection closed")

if __name__ == "__main__":
    import uvicorn
    # Get the port from the environment variable, default to 8000 if not set
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
