document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const startBtn = document.getElementById('startBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const stopBtn = document.getElementById('stopBtn');
    const restartBtn = document.getElementById('restartBtn');
    const exportBtn = document.getElementById('exportBtn');
    const meetingNameInput = document.getElementById('meetingName');
    const statusIndicator = document.getElementById('statusIndicator');
    const countText = document.getElementById('countText');

    // Communication Helper
    async function sendMessage(action, payload = {}) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Basic verification
        if (!tab || !tab.url || !tab.url.startsWith("https://meet.google.com/")) {
            updateStatus("Error: Invalid Page (Meet Only)", false);
            return null;
        }

        try {
            // First attempt
            return await chrome.tabs.sendMessage(tab.id, { action, ...payload });
        } catch (error) {
            // If connection failed, try to inject the script
            if (error.message.includes("Could not establish connection") || 
                error.message.includes("Receiving end does not exist")) {
                
                try {
                    console.log("Injecting content script for recovery...");
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                    // Wait a moment for script to init
                    await new Promise(r => setTimeout(r, 100));
                    // Retry message
                    return await chrome.tabs.sendMessage(tab.id, { action, ...payload });
                } catch (retryError) {
                    console.error("Injection/Retry failed:", retryError);
                    updateStatus("Error: Connection Failed", false);
                }
            } else {
                console.error("Unknown error:", error);
                updateStatus("Error: " + error.message, false);
            }
        }
        return null;
    }

    function updateStatus(text, isActive) {
        statusIndicator.textContent = text;
        statusIndicator.className = isActive ? "badge active" : "badge inactive";
    }

    // UI Update Logic
    function refreshUI(state) {
        if (!state) return; // Don't wipe UI on null
        
        const isRunning = state.isRunning;
        const count = state.count || 0;
        const canResume = state.sessionStarted || count > 0;
        
        // Button Logic
        if (isRunning) {
            // Running: Show STOP. Hide Start/Resume.
            startBtn.style.display = 'block';
            startBtn.disabled = true;
            resumeBtn.style.display = 'none';
            stopBtn.disabled = false;
            meetingNameInput.disabled = true;
            updateStatus("Active", true);
        } else {
            // Stopped: Select Start or Resume
            stopBtn.disabled = true;
            meetingNameInput.disabled = false;
            updateStatus("Stopped", false);

            if (canResume) {
                // Have existing session -> Show Resume
                startBtn.style.display = 'none';
                resumeBtn.style.display = 'block';
                resumeBtn.disabled = false;
            } else {
                // New session -> Show Start
                startBtn.style.display = 'block';
                startBtn.disabled = false;
                resumeBtn.style.display = 'none';
            }
        }
        
        countText.textContent = count;
        
        // Restore name if stored
        if (state.meetingName && !meetingNameInput.value) {
            meetingNameInput.value = state.meetingName;
        }
    }

    // Action Handlers
    async function handleStart() {
        const name = meetingNameInput.value.trim();
        const state = await sendMessage('START', { meetingName: name });
        refreshUI(state);
    }

    async function handleStop() {
        const state = await sendMessage('STOP');
        refreshUI(state);
    }
    
    async function handleRestart() {
        if (confirm("Reset all attendance data? This cannot be undone.")) {
            const state = await sendMessage('RESTART');
            meetingNameInput.value = ""; // Clear input on full restart
            refreshUI(state);
        }
    }

    async function handleExport() {
        const name = meetingNameInput.value.trim();
        const response = await sendMessage('EXPORT', { meetingName: name });
        if (response && response.csvContent) {
            downloadCSV(response.csvContent, response.filename);
        } else {
            alert("No data or error exporting.");
        }
    }
    
    function downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Event Listeners
    startBtn.addEventListener('click', handleStart);
    resumeBtn.addEventListener('click', handleStart); // Resume is just Start (logic persists state)
    stopBtn.addEventListener('click', handleStop);
    restartBtn.addEventListener('click', handleRestart);
    exportBtn.addEventListener('click', handleExport);

    // Initial Status Check
    sendMessage('GET_STATUS').then(refreshUI);

    // Poll for status (keep UI in sync)
    setInterval(async () => {
        if (!statusIndicator.textContent.includes("Error")) {
            const state = await sendMessage('GET_STATUS');
            refreshUI(state);
        }
    }, 2000);

});
