/* ============================================================
   FOCUS & FLOW — script.js

   This file handles two separate modules:
   A) Media player controls  (togglePlayPause, updateProgress,
      seekVideo, setVolume, toggleMute, toggleFullscreen,
      formatTime, updateTimeDisplay)
   B) Pomodoro focus timer  (setDuration, startTimer, resetTimer,
      updateTimerDisplay, handleTimerEnd)

   Keeping the two modules in one file avoids an extra HTTP request
   while still being readable because they are clearly separated
   by comments.

   Reference — HTMLMediaElement API:
   MDN Web Docs. (n.d.). HTMLMediaElement.
   https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement

   Reference — Fullscreen API:
   MDN Web Docs. (n.d.). Fullscreen API.
   https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API

   Reference — setInterval / Date.now timestamp approach:
   MDN Web Docs. (n.d.). setInterval().
   https://developer.mozilla.org/en-US/docs/Web/API/setInterval
============================================================ */


/* ================================================================
   MODULE A — MEDIA PLAYER
================================================================ */

/* DOM references */
const video        = document.getElementById('custom-video-player');
const playPauseImg = document.getElementById('play-pause-img');
const progressFill = document.getElementById('progress-bar-fill');
const progressBar  = document.getElementById('progress-bar');
const timeDisplay  = document.getElementById('time-display');
const muteImg      = document.getElementById('mute-img');


/* ------------------------------------------------------------
   togglePlayPause()
   Called by the play/pause button onclick.
   Checks video.paused: if true → play and show pause icon;
   if false → pause and show play icon.
   Icon URLs come from Icons8 (credited in footer).
------------------------------------------------------------ */
function togglePlayPause() {
    if (video.paused) {
        video.play();
        playPauseImg.src = 'https://img.icons8.com/ios-glyphs/30/pause--v1.png';
        playPauseImg.alt = 'Pause';
    } else {
        video.pause();
        playPauseImg.src = 'https://img.icons8.com/ios-glyphs/30/play--v1.png';
        playPauseImg.alt = 'Play';
    }
}


/* ------------------------------------------------------------
   updateProgress()
   Fires on every 'timeupdate' event (~4× per second).
   Calculates percentage played and widens the progress fill bar.
   Also calls updateTimeDisplay() to keep the clock fresh.
------------------------------------------------------------ */
function updateProgress() {
    if (video.duration) {
        const percent = (video.currentTime / video.duration) * 100;
        progressFill.style.width = percent + '%';
        updateTimeDisplay();
    }
}


/* ------------------------------------------------------------
   seekVideo(event)
   Called when the user clicks the progress bar.
   event.offsetX is the horizontal pixel position of the click
   relative to the bar element. Dividing by the bar's total width
   gives a 0–1 fraction; multiplying by duration gives seconds.
------------------------------------------------------------ */
function seekVideo(event) {
    const fraction = event.offsetX / progressBar.offsetWidth;
    video.currentTime = fraction * video.duration;
}


/* ------------------------------------------------------------
   setVolume(value)
   Called by the volume slider oninput.
   The slider's min/max is 0–1 so its value maps directly to
   video.volume. If the user drags up from zero, mute is cleared
   so the visual state (icon) stays consistent with the audio.
------------------------------------------------------------ */
function setVolume(value) {
    video.volume = value;
    if (parseFloat(value) > 0 && video.muted) {
        video.muted = false;
        muteImg.src = 'https://img.icons8.com/ios-glyphs/30/speaker--v1.png';
        muteImg.alt = 'Speaker';
    }
}


/* ------------------------------------------------------------
   toggleMute()
   Flips video.muted and swaps the button icon.
   The volume slider position is not changed — unmuting restores
   audio at the level the slider shows, which is expected behaviour.
------------------------------------------------------------ */
function toggleMute() {
    if (video.muted) {
        video.muted = false;
        muteImg.src = 'https://img.icons8.com/ios-glyphs/30/speaker--v1.png';
        muteImg.alt = 'Speaker';
    } else {
        video.muted = true;
        muteImg.src = 'https://img.icons8.com/ios-glyphs/30/mute--v1.png';
        muteImg.alt = 'Muted';
    }
}


/* ------------------------------------------------------------
   toggleFullscreen()
   Uses the standard Fullscreen API with a webkit prefix fallback
   for Safari compatibility.
------------------------------------------------------------ */
function toggleFullscreen() {
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    }
}


/* ------------------------------------------------------------
   formatTime(seconds)
   Converts a raw seconds value into a "m:ss" string.
   padStart(2, '0') ensures seconds are always two digits.
   Example: formatTime(83) → "1:23"
------------------------------------------------------------ */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + String(secs).padStart(2, '0');
}


/* ------------------------------------------------------------
   updateTimeDisplay()
   Writes "currentTime / duration" into the #time-display span.
   Falls back to "0:00" if duration is not yet known (before
   metadata loads).
------------------------------------------------------------ */
function updateTimeDisplay() {
    const current  = formatTime(video.currentTime);
    const total    = video.duration ? formatTime(video.duration) : '0:00';
    timeDisplay.textContent = current + ' / ' + total;
}


/* Media player event listeners */
video.addEventListener('timeupdate', updateProgress);
video.addEventListener('loadedmetadata', updateTimeDisplay);
video.addEventListener('ended', function () {
    playPauseImg.src = 'https://img.icons8.com/ios-glyphs/30/play--v1.png';
    playPauseImg.alt = 'Play';
});


/* ================================================================
   MODULE B — POMODORO FOCUS TIMER

   Design decision — timestamp comparison vs. decrement:
   Rather than decrementing a counter every second with setInterval,
   this timer records a start timestamp (Date.now()) and calculates
   how many milliseconds have elapsed on each tick. This approach
   is more accurate because setInterval is not guaranteed to fire
   exactly on time — the browser can delay it when the tab is
   backgrounded or the CPU is busy. Using Date.now() means the
   displayed time always reflects real elapsed time.

   The interval fires every 250 ms (faster than once per second)
   so the display updates promptly when the tab regains focus
   after being backgrounded, without appearing to skip a second.
================================================================ */

/* Timer state variables */
let timerInterval   = null;   /* reference to the active setInterval */
let timerRunning    = false;
let totalSeconds    = 25 * 60; /* default: 25 minutes */
let remainingSeconds = totalSeconds;
let startTimestamp  = null;   /* Date.now() at last Start press */

/* DOM references for the timer */
const timerDisplay  = document.getElementById('timer-display');
const startBtn      = document.getElementById('start-btn');
const goalInput     = document.getElementById('goal-input');
const goalConfirm   = document.getElementById('goal-confirm');


/* ------------------------------------------------------------
   setDuration(mins)
   Called by the preset buttons (25 / 45 / 60 min).
   Only works when the timer is not running — prevents changing
   the duration mid-session which would confuse the user.
   Updates the active class on the preset buttons to show which
   one is selected.
------------------------------------------------------------ */
function setDuration(mins) {
    if (timerRunning) return; /* ignore clicks during an active session */

    totalSeconds     = mins * 60;
    remainingSeconds = totalSeconds;
    updateTimerDisplay(remainingSeconds);

    /* Update the active preset button highlight */
    document.querySelectorAll('.preset-btn').forEach(function (btn) {
        btn.classList.toggle('active', parseInt(btn.dataset.mins) === mins);
    });
}


/* ------------------------------------------------------------
   startTimer()
   Toggles between Start and Pause states.
   On Start: records the goal text as a confirmation message,
   captures the current timestamp, and begins the interval.
   On Pause: clears the interval and adjusts remainingSeconds
   so resuming picks up exactly where it left off.
------------------------------------------------------------ */
function startTimer() {
    if (!timerRunning) {
        /* --- Start or Resume --- */
        timerRunning = true;
        startBtn.textContent = 'Pause';

        /* Show the study goal as a confirmation — gives user feedback
           that their intention has been noted before the session begins */
        const goal = goalInput.value.trim();
        if (goal) {
            goalConfirm.textContent = '✦ Focusing on: ' + goal;
        } else {
            goalConfirm.textContent = '✦ Session started. Stay focused.';
        }

        /* Record when this interval of running began */
        startTimestamp = Date.now() - ((totalSeconds - remainingSeconds) * 1000);

        timerInterval = setInterval(function () {
            /* Calculate remaining time from elapsed real time */
            const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
            remainingSeconds = totalSeconds - elapsed;

            if (remainingSeconds <= 0) {
                remainingSeconds = 0;
                updateTimerDisplay(0);
                handleTimerEnd();
                return;
            }

            updateTimerDisplay(remainingSeconds);
        }, 250);

    } else {
        /* --- Pause --- */
        timerRunning = false;
        startBtn.textContent = 'Resume';
        clearInterval(timerInterval);
        timerInterval = null;
    }
}


/* ------------------------------------------------------------
   resetTimer()
   Stops the timer, clears the interval, and restores the display
   to the currently selected duration. Also clears the goal
   confirmation message.
------------------------------------------------------------ */
function resetTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    timerInterval    = null;
    remainingSeconds = totalSeconds;
    startBtn.textContent = 'Start';
    goalConfirm.textContent = '';
    updateTimerDisplay(remainingSeconds);
}


/* ------------------------------------------------------------
   updateTimerDisplay(seconds)
   Formats the remaining seconds into "mm:ss" and writes it
   into the Nixie digit element. formatTime() is reused from
   Module A — same logic, same readability.
------------------------------------------------------------ */
function updateTimerDisplay(seconds) {
    timerDisplay.textContent = formatTime(seconds);
}


/* ------------------------------------------------------------
   handleTimerEnd()
   Called when the countdown reaches zero.
   Clears the interval, resets running state, and alerts the user.
   The native alert() is used deliberately: it interrupts whatever
   the user is doing (they may be reading elsewhere) and forces
   acknowledgement — which is appropriate for a timer notification.
   A more sophisticated implementation could use the Notifications
   API, but that requires user permission which adds complexity
   beyond the scope of this assignment.
------------------------------------------------------------ */
function handleTimerEnd() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning  = false;
    startBtn.textContent = 'Start';

    const goal = goalInput.value.trim();
    const message = goal
        ? 'Session complete!\n\nYou focused on: ' + goal + '\n\nTake a short break.'
        : 'Session complete!\n\nTime for a short break.';

    alert(message);

    /* Reset for next session */
    remainingSeconds = totalSeconds;
    updateTimerDisplay(remainingSeconds);
    goalConfirm.textContent = '';
}
