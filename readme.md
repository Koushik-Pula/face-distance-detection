# Face Distance Detection

This project detects the distance of a person's face from the camera using computer vision techniques. It features a backend powered by Python and a frontend built using modern web technologies.

## Prerequisites

Before running the project, ensure you have the following tools and dependencies installed:

1. **Python** (Version 3.8 or above)
2. **pip** (Python package manager)
3. **Node.js** (Version 14 or above)
4. **npm** (Node.js package manager)

## Required Python Libraries

The following Python libraries must be installed to run the backend:

- `opencv-python`


These can be installed manually using pip as shown in the steps below.

## Getting Started

Follow the steps below to set up and run the project.

### 1. Clone the Repository

```bash
git clone https://github.com/Koushik-Pula/face-distance-detection.git
cd face-distance-detection
```

### 2. Set Up the Backend

#### Create and Activate a Virtual Environment (Optional but Recommended)

Create and activate a virtual environment to isolate dependencies:

```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### Install Backend Dependencies

Manually install the required Python dependencies:

```bash
pip install opencv-python 
```

#### Run the Backend Server

Execute the `main.py` script to start the backend server:

```bash
python backend/main.py
```

### 3. Set Up and Run the Frontend

#### Install Frontend Dependencies

Install the necessary npm packages:

```bash
npm install
```

#### Start the Frontend Development Server

Run the following command to start the frontend development server:

```bash
npm run dev
```

### 4. Access the Application

Once both the backend and frontend servers are running:

- Open your browser and navigate to the URL displayed by the frontend development server (e.g., `http://localhost:3000`).

## Project Structure

- `app/`:
- `backend/`: Contains the Python backend server code.
   - `main.py`: Main script to run the backend server.
- `README.md`: Documentation for the project.

## Notes

- Ensure that your system's camera permissions are enabled for the script to access the webcam.
- For best results, run the program in a well-lit environment.

## Troubleshooting

- **Problem**: "Module not found" error when running the backend script.\
  **Solution**: Manually install the required libraries using `pip install opencv-python numpy dlib imutils`.

- **Problem**: Frontend not loading.\
  **Solution**: Verify that `npm run dev` is running successfully and check the console for errors.

- **Problem**: Camera feed not displaying.\
  **Solution**: Verify your camera is connected and not being used by another application.

## Contributing

Feel free to open issues or submit pull requests to enhance the project.



Happy coding!

