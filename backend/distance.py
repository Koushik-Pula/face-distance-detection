import base64
import cv2
import asyncio
import websockets
import json

KNOWN_DISTANCE = 0.45 
KNOWN_WIDTH = 0.15  

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def calculate_focal_length(known_distance, known_width, pixel_width):
    focal_length = (pixel_width * known_distance) / known_width
    return focal_length

def detect_face_and_distance(frame, focal_length):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    if len(faces) > 0:
        (x, y, w, h) = faces[0]
       
        distance = (KNOWN_WIDTH * focal_length) / w

        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)


        label = f"{distance:.2f}m"
        cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        return distance, frame
    else:
        return None, frame

async def calibrate(cap, websocket):
    await websocket.send_json({"calibrationStatus": "Calibrating... Please wait."})
    focal_length = None
    for i in range(30):
        ret, frame = cap.read()
        if not ret:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))

        if len(faces) > 0:
            (x, y, w, h) = faces[0]
            focal_length = calculate_focal_length(KNOWN_DISTANCE, KNOWN_WIDTH, w)
            await websocket.send_json({
                "calibrationStatus": f"Calibration successful with focal length: {focal_length:.2f}",
                "progress": 100
            })
            break

        await websocket.send_json({"calibrationStatus": f"Calibrating... {i+1}/30", "progress": (i+1) * 100 // 30})
        await asyncio.sleep(0.1)

    if focal_length is None:
        await websocket.send_json({"calibrationStatus": "Calibration failed. No face detected.", "progress": 100})
        raise Exception("Calibration failed. No face detected.")

    await websocket.send_json({"calibrationStatus": "Calibration complete.", "progress": 100})
    return focal_length

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()

async def handler(websocket, path):
    cap = cv2.VideoCapture(0)
    try:
        focal_length = await calibrate(cap, websocket)
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            distance, processed_frame = detect_face_and_distance(frame, focal_length)
            if distance is not None:
                await websocket.send(json.dumps({"distance": distance}))
            _, buffer = cv2.imencode('.jpg', processed_frame)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            await websocket.send_json({
                "image": jpg_as_text,
                "distance": distance if distance is not None else -1
            })
            await asyncio.sleep(0.1)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        cap.release()
        await websocket.close()

if __name__ == "__main__":
    asyncio.run(main())
