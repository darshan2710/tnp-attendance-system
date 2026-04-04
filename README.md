# T&P Attendance System

This is a full-stack web application designed for the Training and Placement (T&P) cell of IIIT Surat to manage and process student attendance records originating from a centralized Google Sheet. The system provides role-based access for administrators and professors, each with a dedicated dashboard and functionalities.

## Core Features

-   **Role-Based Dashboards**: Separate, feature-rich interfaces for Admins (T&P staff) and Professors.
-   **Google Sheets Integration**: Fetches raw attendance data directly from a designated Google Sheet, serving as the single source of truth.
-   **Attendance Processing Workflow**:
    -   Professors can view unprocessed attendance records for their assigned subjects.
    -   They can mark records as processed, which moves them to an archived state and removes them from the pending queue.
-   **Data Export**: Both admins and professors can download attendance data in CSV format, filtered by their respective permissions.
-   **Secure Authentication**: User authentication is handled using JSON Web Tokens (JWT) with password hashing via `bcryptjs`.
-   **Dynamic UI**: A responsive, modern user interface built with React, featuring a dark/light mode toggle.

### Admin Dashboard

-   **Global View**: View all unprocessed attendance records across all subjects.
-   **Professor Management**: Add, remove, and update the subject assignments for professor accounts.
-   **Processed Logs**: Access a complete archive of all attendance records that have been marked as processed.
-   **Password Management**: Ability to change their own account password.

### Professor Dashboard

-   **Subject-Specific View**: View and manage attendance records only for the subjects they are assigned.
-   **Mark as Processed**: Select attendance records by date and mark them as processed to clear them from the pending list.
-   **Archive View**: Review a history of attendance records they have previously marked.
-   **Password Management**: Securely change their own account password.

## Technology Stack

-   **Backend**:
    -   **Framework**: Node.js with Express.js
    -   **Database**: MongoDB with Mongoose ODM
    -   **Authentication**: JSON Web Token (`jsonwebtoken`), `bcryptjs`
    -   **Data Parsing**: `papaparse` for parsing CSV data from Google Sheets
-   **Frontend**:
    -   **Library/Framework**: React (with Vite)
    -   **Routing**: React Router
    -   **HTTP Client**: Axios
    -   **UI**: Custom CSS with light/dark themes, `lucide-react` for icons.
-   **Deployment**:
    -   The backend is deployed on Railway.
    -   The frontend is deployed on Netlify.

## Architecture Overview

The application follows a monorepo structure with a `client` and `server` directory.

1.  **Data Source**: A public Google Sheet contains the raw attendance data. The backend fetches this data by exporting the sheet as a CSV file.
2.  **Backend (Server)**: The Express API serves as the system's core.
    -   It connects to a MongoDB database to store user information and records of processed attendances.
    -   When a request for attendance data is made, the server fetches the latest data from the Google Sheet.
    -   It then cross-references this data with the `ProcessedAttendance` collection in MongoDB to determine which records are "unprocessed".
    -   It exposes REST endpoints for authentication, data retrieval, and marking records as processed.
3.  **Frontend (Client)**: The React SPA consumes the backend API.
    -   After a user logs in, their role (admin or professor) determines which dashboard is rendered.
    -   The client application manages state for authentication and theme using React's Context API.
    -   The UI allows users to interact with the attendance data, such as viewing, selecting, and marking it as processed.

## Local Development Setup

To run this project locally, you will need Node.js and a running MongoDB instance.

### Backend Server Setup

1.  **Navigate to the server directory**:
    ```bash
    cd server
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up environment variables**:
    Create a `.env` file in the `server` directory and add your MongoDB connection string and a JWT secret:
    ```env
    MONGO_URI=mongodb://localhost:27017/tnp-attendance
    JWT_SECRET=your_jwt_secret_key
    ```
4.  **Start the server**:
    For development with auto-reloading:
    ```bash
    npm run dev
    ```
    The server will start on port 5000.

### Frontend Client Setup

1.  **Navigate to the client directory**:
    ```bash
    cd client
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Update API Endpoint**:
    The client-side code contains a hardcoded API URL for the production backend. For local development, you must change this to point to your local server.
    Search for `https://tnp-attendance-system-production-5a81.up.railway.app` in the following files and replace it with `http://localhost:5000`:
    -   `client/src/context/AuthContext.jsx`
    -   `client/src/pages/AdminDashboard.jsx`
    -   `client/src/pages/ProfessorDashboard.jsx`

4.  **Start the client**:
    ```bash
    npm run dev
    ```
    The React application will start, typically on port 5173.
