import cv2
import asyncio

# Load the cascade classifier
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Known values for distance and width calculation
KNOWN_DISTANCE = 40  # cm (Adjust this based on your actual calibration distance)
KNOWN_WIDTH = 15  # cm (Known width of the face)

# A smaller scaling factor to fine-tune the distance calculation
SCALING_FACTOR = 1.5  # Adjust this value to match your actual distance (adjust as needed)

def calculate_focal_length(distance, known_width, pixel_width):
    focal_length = (pixel_width * distance) / known_width
    return focal_length


def estimate_distance(focal_length, known_width, pixel_width):
    distance = (known_width * focal_length) / pixel_width
    return distance * SCALING_FACTOR  # Apply the scaling factor to adjust the result


async def calibrate(cap):
    print("Calibrating... Please wait.")
    focal_length = None
    for _ in range(30):  # Try to calibrate for 30 frames
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
        # Draw rectangle around the face only if a face is detected
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(frame, f"Distance: {distance_m:.2f} meters", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        return distance_m
    else:
        print("No face detected")
        cv2.putText(frame, "No face detected", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        return None  # Return None if no face is detected


# Initialize the video capture object
cap = cv2.VideoCapture(0)

# Calibrate the camera
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

        # Display the frame
        cv2.imshow('Frame', frame)

        # Exit loop if 'q' is pressed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # When everything done, release the capture
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    asyncio.run(main())
