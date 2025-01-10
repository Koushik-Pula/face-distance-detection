from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
import asyncio
from distance import calibrate, detect_face_and_distance

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_camera():
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        raise RuntimeError("Could not start camera.")
    return camera

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        camera = await get_camera()
        await websocket.send_json({"message": "Camera initialized"})
        
        # Calibration
        focal_length = await calibrate(camera)
        await websocket.send_json({"message": "Calibration complete"})
        
        while True:
            ret, frame = camera.read()
            if not ret:
                await websocket.send_json({"error": "Failed to capture frame"})
                break
            
            distance = detect_face_and_distance(frame, focal_length)
            
            _, buffer = cv2.imencode('.jpg', frame)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            await websocket.send_json({
                "image": jpg_as_text,
                "distance": distance if distance is not None else -1
            })
            
            await asyncio.sleep(0.1)
    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        camera.release()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)