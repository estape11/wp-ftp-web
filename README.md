# FTP Basic - Web Client

A simple, lightweight FTP server and web client designed for high compatibility with older browsers, including Internet Explorer Mobile on Windows Phone 8.1. The application provides a clean, modern interface inspired by the Windows Phone "Metro" UI.

## Features

*   **File Listing:** View all files on the server with metadata (size, modification date, type).
*   **Pagination:** Efficiently browse through large numbers of files.
*   **Search:** Instantly filter the file list by name.
*   **Sorting:** Sort files by name, size, date, or type.
*   **Bulk Uploads:** Upload multiple files at once with a drag-and-drop interface.
*   **Progress Bar:** Monitor upload progress in real-time.
*   **Cancel Uploads:** Cancel an ongoing upload.
*   **File Actions:**
    *   **Preview:** View images and text files directly in the browser.
    *   **Download:** Download files to your device.
    *   **Delete:** Remove files from the server.
*   **Responsive UI:** A clean, touch-friendly interface that works on modern and legacy browsers.
*   **Bootsplash Screen:** A Windows Phone-style loading animation is displayed while the application loads.

## Tech Stack

*   **Backend:** Node.js with Express and Multer for handling file operations.
*   **Frontend:** HTML5, CSS3, and jQuery (v1.x for maximum browser compatibility).

## Project Evolution Summary

This project was built iteratively based on the following user requests:

1.  Create a simple FTP server and a web client compatible with Windows Phone 8.1.
2.  Enable bulk (multiple file) uploads.
3.  Redesign the UI to resemble the Windows Phone "Metro" style.
4.  Add multi-page support, file metadata display, and search functionality.
5.  Improve the upload section with a progress bar and a more modern UI.
6.  Initialize a Git repository for version control.
7.  Add a refresh button and file sorting options (by date, name, size, type).
8.  Replace text-based buttons with Windows Phone-style icons.
9.  Make the preview modal's close button more accessible.
10. Enable file preview by clicking on the entire file row.
11. Add a Windows Phone-style bootsplash loading screen.
12. Implement a feature to cancel ongoing uploads.
13. Create this `README.md` file.

## How to Run the Application

1.  **Prerequisites:** Make sure you have [Node.js](https://nodejs.org/) installed on your system.

2.  **Install Dependencies:** Open a terminal in the project's root directory and run the following command to install the required packages (`express` and `multer`):
    ```bash
    npm install
    ```

3.  **Run the Server:** Start the server with this command:
    ```bash
    node server.js
    ```

4.  **Access the Client:** Open your web browser and navigate to:
    [http://localhost:3000](http://localhost:3000)

## How to Use the Application

*   **Viewing Files:** The main screen displays a paginated list of all files in the `uploads/` directory.
*   **Uploading:** Drag and drop files onto the designated area, or click "Select Files" to open a file dialog. You can select multiple files.
*   **Searching and Sorting:** Use the search bar to filter files by name or the dropdown menu to sort the list.
*   **File Actions:**
    *   Click anywhere on a file's row (or the eye icon) to **preview** it.
    *   Click the download icon to **download** a file.
    *   Click the trash can icon to **delete** a file.
