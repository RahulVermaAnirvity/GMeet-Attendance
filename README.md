# GMeet Attendance

**GMeet Attendance** is a lightweight Google Chrome Extension (Manifest V3) that automates the process of collecting attendance in Google Meet. It extracts participant names and emails directly from the chat and exports the data to a clean CSV file.

## 🚀 Features

*   **Automated Tracking**: Observes chat messages in real-time to capture attendance.
*   **Smart Parsing**: Intelligently extracts "Name" and "Email" from messages (e.g., `John Doe john@example.com`).
    *   Handles scenarios where Google Meet splits name and email into different DOM elements.
    *   Fallback mechanism to use email prefix if no name is found.
*   **Session Management**:
    *   **Start**: Begin monitoring.
    *   **Stop**: Pause monitoring.
    *   **Resume**: Continue from where you left off.
    *   **Restart**: Clear data and start a fresh session.
*   **CSV Export**:
    *   Generates a formatted CSV file.
    *   **Filename Format**: `MeetingName_DD-MM-YYYY_HH-MM-AMPM.csv` (e.g., `Daily_Standup_07-01-2026_09-00-AM.csv`).
    *   **Columns**: Name, Email, Time, Date.
*   **Data Persistence**: Keeps your data safe even if the extension popup is closed or re-opened.

## 🛠️ Tech Stack

*   **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Platform**: Google Chrome Extensions API (Manifest V3)
*   **APIs Used**:
    *   `MutationObserver` (for real-time DOM monitoring)
    *   `chrome.runtime` & `chrome.tabs` (for communication)
    *   `chrome.scripting` (for robust injection)

## 📥 Installation (Run Locally)

Since this is a custom extension, you need to load it manually into Chrome:

1.  **Clone or Download** this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click the **Load unpacked** button.
5.  Select the **folder** where you saved this project (the folder containing `manifest.json`).
6.  The extension should now appear in your list with the name **GMeet Attendance**.

## 📖 How to Use

1.  **Join a Google Meet** session.
2.  Click the **GMeet Attendance icon** in your browser toolbar.
3.  (Optional) Enter a **Meeting Name** (e.g., "Physics Class", "Team Sync").
4.  Click **Start**.
5.  Ask participants to type their details in the chat in the format:
    > `Firstname Lastname email@address.com`
    *   *Example*: `Rahul Verma rahul@example.com`
6.  The extension will automatically count valid entries.
7.  Click **Export to CSV** to download the attendance sheet.

## 🤝 Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
