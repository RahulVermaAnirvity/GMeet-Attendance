/**
 * Google Meet Attendance Extension - Content Script
 * 
 * Logic:
 * 1. Listen for START/STOP commands from popup.
 * 2. On START, observe document.body for Chat DOM mutations.
 * 3. Filter for chat messages containing "Name <Email>" or similar patterns.
 * 4. Extract sender name and email (with fallback to parent traversing).
 * 5. Store in persistent memory (window.gmeetState).
 * 6. Handle exports.
 */

// --- Initialization & State ---

// Prevent duplicate execution context issues
if (!window.gmeetAttendanceActive) {
    window.gmeetAttendanceActive = true;
    console.log("[Attendance] Script loaded.");
}

// Ensure state persists logic (even if script is re-injected)
if (!window.gmeetState) {
    window.gmeetState = {
        attendanceMap: new Map(),
        isRunning: false,
        observer: null,
        startTimestamp: null,
        meetingName: ""
    };
}

// Convenience reference
const state = window.gmeetState;

// --- Regex & Selectors ---
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

// --- Core Logic ---

/**
 * Handle DOM mutations to find chat messages
 */
function handleMutations(mutations) {
    if (!state.isRunning) return;

    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    processNode(node);
                }
            });
        }
    }
}

/**
 * Check if a node contains a chat message with an email
 */
function processNode(node) {
    if (!node.innerText) return;

    // Fast check: Must contain an email pattern
    if (EMAIL_REGEX.test(node.innerText)) {
        parseCandidateNode(node);
    }
}

/**
 * Parse the node to extract Name and Email
 */
function parseCandidateNode(node) {
    const text = node.innerText || "";
    const emailMatch = text.match(EMAIL_REGEX);
    
    if (!emailMatch) return;
    
    const email = emailMatch[1].toLowerCase();
    let fullText = text;
    
    // Attempt to extract name from the *current* node text first
    // Logic: Message is "Name Email" -> remove email -> rest is Name
    let nameRaw = fullText.replace(emailMatch[0], "").trim();

    // Context Awareness: 
    // Google Meet sometimes separates Name and Message (Email) into valid HTML siblings or parents.
    // If the text we found is *only* the email (or very short garbage), the Name is likely in a parent container.
    if (nameRaw.length < 2) {
        let current = node.parentElement;
        // Traverse up to find a container that includes both Name and Email
        for (let i = 0; i < 3 && current; i++) {
            const parentText = current.innerText || "";
            // The parent must still contain the email we found
            if (parentText.includes(email)) {
                const potentialName = parentText.replace(emailMatch[0], "").trim();
                // If this parent provides a longer (better) name, use it
                if (potentialName.length > nameRaw.length) {
                    fullText = parentText;
                    nameRaw = potentialName;
                    if (nameRaw.length > 2) break; // Found a decent name
                }
            }
            current = current.parentElement;
        }
    }

    // Cleanup common separators found in chat lines (dash, colon, etc.)
    // e.g. "Rahul - rahul@gmail.com" -> "Rahul"
    nameRaw = nameRaw.replace(/^[-:;,|]+|[-:;,|]+$/g, "").trim();

    // Fallback: If still no name, use email prefix
    let name = nameRaw;
    if (!name || name.length === 0) {
        name = email.split('@')[0];
    }

    recordAttendance(name, email);
}

/**
 * Persist the attendance record
 */
function recordAttendance(name, email) {
    const now = new Date();
    
    // Date: DD/MM/YYYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    // Time: HH:MM AM/PM
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    // Store in Map (Updates existing entry with latest name/time)
    state.attendanceMap.set(email, {
        name: name,
        email: email,
        time: timeStr,
        date: dateStr,
        timestamp: now.getTime()
    });
    
    // Console verify
    // console.log(`[Attendance] Captured: ${name}`);
}

// --- Control Functions ---

function startAttendance(name) {
    if (state.isRunning) return getStatus();

    if (name) state.meetingName = name;
    
    state.isRunning = true;
    if (!state.startTimestamp) {
        state.startTimestamp = Date.now();
    }

    if (!state.observer) {
        state.observer = new MutationObserver(handleMutations);
    }
    
    state.observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log("[Attendance] Started.");
    return getStatus();
}

function stopAttendance() {
    state.isRunning = false;
    if (state.observer) {
        state.observer.disconnect();
    }
    console.log("[Attendance] Stopped.");
    return getStatus();
}

function restartAttendance() {
    stopAttendance();
    state.attendanceMap.clear();
    state.meetingName = "";
    state.startTimestamp = null;
    console.log("[Attendance] Session Reset.");
    return getStatus();
}

function getStatus() {
    return {
        isRunning: state.isRunning,
        count: state.attendanceMap.size,
        meetingName: state.meetingName,
        sessionStarted: !!state.startTimestamp
    };
}

function generateCSV(providedName) {
    const meetingName = providedName || state.meetingName;
    const headers = ["Name", "Email", "Time", "Date"];
    const rows = [];
    
    state.attendanceMap.forEach(r => {
        const safeName = `"${r.name.replace(/"/g, '""')}"`;
        const safeEmail = `"${r.email}"`;
        rows.push([safeName, safeEmail, r.time, r.date]);
    });

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

    // Filename Generation
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    
    let hours = now.getHours();
    const min = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${String(hours).padStart(2, '0')}-${min}-${ampm}`;
    
    let filename = "";
    if (meetingName) {
        const safe = meetingName.replace(/[^a-zA-Z0-9-_ ]/g, "_");
        filename += `${safe}_`;
    }
    filename += `${d}-${m}-${y}_${timeStr}.csv`;

    return {
        csvContent,
        filename,
        ...getStatus()
    };
}

// --- Message Listener ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("[Attendance] Message received:", request.action);
    switch (request.action) {
        case 'START':
            sendResponse(startAttendance(request.meetingName));
            break;
        case 'STOP':
            sendResponse(stopAttendance());
            break;
        case 'RESTART':
            sendResponse(restartAttendance());
            break;
        case 'EXPORT':
            sendResponse(generateCSV(request.meetingName));
            break;
        case 'GET_STATUS':
            sendResponse(getStatus());
            break;
        default:
            sendResponse(getStatus());
    }
});
