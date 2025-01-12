import cv2
import asyncio


face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


KNOWN_DISTANCE = 40 
KNOWN_WIDTH = 15 


SCALING_FACTOR = 1.0 

def calculate_focal_length(distance, known_width, pixel_width):
    focal_length = (pixel_width * distance) / known_width
    return focal_length


def estimate_distance(focal_length, known_width, pixel_width):
    distance = (known_width * focal_length) / pixel_width
    return distance * SCALING_FACTOR 


async def calibrate(cap):
    print("Calibrating... Please wait.")
    focal_length = None
    for _ in range(30):  
        ret, frame = cap.read()
        if not ret:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) > 0:
            (x, y, w, h) = faces[0]
            focal_length = calculate_focal_length(KNOWN_DISTANCE, KNOWN_WIDTH, w)
            break

        await asyncio.sleep(0.1)

    if focal_length is None:
        raise Exception("Calibration failed. No face detected.")

    print("Calibration complete.")
    return focal_length


def detect_face_and_distance(frame, focal_length):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if len(faces) > 0:
        (x, y, w, h) = faces[0]
        distance_cm = estimate_distance(focal_length, KNOWN_WIDTH, w)
        distance_m = distance_cm / 100.0
        
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(frame, f"Distance: {distance_m:.2f} meters", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        return distance_m
    else:
        print("No face detected")
        cv2.putText(frame, "No face detected", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        return None  



cap = cv2.VideoCapture(0)


async def main():
    focal_length = await calibrate(cap)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        distance = detect_face_and_distance(frame, focal_length)
        if distance is not None:
            print(f"Distance: {distance:.2f} meters")
        else:
            print("No face detected")

      
        cv2.imshow('Frame', frame)

        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    asyncio.run(main())
