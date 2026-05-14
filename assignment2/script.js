/* This file handles two separate modules:
   A) Media player controls  (togglePlayPause, updateProgress, seekVideo, setVolume, toggleMute, toggleFullscreen,formatTime, updateTimeDisplay)
   B) focus timer  (setDuration, startTimer, resetTimer, updateTimerDisplay, handleTimerEnd)

   Reference — HTMLMediaElement API:
   MDN Web Docs. (n.d.). HTMLMediaElement.
   https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement

   Fullscreen API:
   MDN Web Docs. (n.d.). Fullscreen API.
   https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API

   setInterval / Date.now timestamp approach:
   MDN Web Docs. (n.d.). setInterval().
   https://developer.mozilla.org/en-US/docs/Web/API/setInterval
*/


/* A:MEDIA PLAYER */

/* DOM references */
const video = document.getElementById('custom-video-player');
const playPauseImg = document.getElementById('play-pause-img');
const progressFill = document.getElementById('progress-bar-fill');
const progressBar = document.getElementById('progress-bar');
const timeDisplay = document.getElementById('time-display');
const muteImg = document.getElementById('mute-img');


/*
   togglePlayPause()
   Called by the play/pause button onclick.
   Checks video.paused: if true - play and show pause icon;
   if false - pause and show play icon.
   Icon URLs come from Icons8
*/
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


/* updateProgress()
   Executed whenever a “timeupdate” event is triggered.
   It also calls updateTimeDisplay() to ensure the clock display is kept up to date.*/
function updateProgress() {
    if (video.duration) {
        const percent = (video.currentTime / video.duration) * 100;
        progressFill.style.width = percent + '%';
        updateTimeDisplay();
    }
}


/*
   seekVideo(event)
    event.offsetX is the horizontal pixel coordinate of the click relative to the progress bar. Divide this by the total width of the progress bar,to obtain a fraction between 0 and 1; multiply this by the duration to get the number of seconds.
 */
function seekVideo(event) {
    const fraction = event.offsetX / progressBar.offsetWidth;
    video.currentTime = fraction * video.duration;
}


/*
   setVolume(value)
   Triggered by the `oninput` event of the volume slider.
   The slider’s minimum and maximum values are 0–1. If the user drags upwards from the zero point, the mute state is cancelled, ensuring that the icon matches the audio status.
 */
function setVolume(value) {
    video.volume = value;
    if (parseFloat(value) > 0 && video.muted) {
        video.muted = false;
        muteImg.src = 'https://img.icons8.com/ios-glyphs/30/speaker--v1.png';
        muteImg.alt = 'Speaker';
    }
}


/*
   toggleMute()
   Toggle the ‘Mute video’ setting and change the button icon.
    The position of the volume slider will not change after unmuting, and the volume will return to the level indicated by the slider.
 */
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


/*
   toggleFullscreen()
   Uses the standard Fullscreen API with a webkit prefix fallback
   for Safari compatibility.
 */
function toggleFullscreen() {
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    }
}


/*
   formatTime(seconds)
   Converts a raw seconds value into a "m:ss" string.
   padStart(2, '0') ensures seconds are always two digits.

 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + String(secs).padStart(2, '0');
}


/*
   updateTimeDisplay()
   Writes "currentTime / duration" into the #time-display span.
   Falls back to "0:00" if duration is not yet known.
 */
function updateTimeDisplay() {
    const current = formatTime(video.currentTime);
    const total = video.duration ? formatTime(video.duration) : '0:00';
    timeDisplay.textContent = current + ' / ' + total;
}


/* Media player event listeners */
video.addEventListener('timeupdate', updateProgress);
video.addEventListener('loadedmetadata', updateTimeDisplay);
/* 'ended' listener removed: the video now has the loop attribute,
   so it restarts automatically. */


/*
   Pomodoro Focus Timer

   Unlike using `setInterval` to decrement a counter every second, this timer records the start timestamp (`Date.now()`) and calculates the number of milliseconds elapsed at the end of each timing cycle. This method is more accurate.The timer triggers every 250 milliseconds,so the display updates promptly when the tab is restored from the background.
 */

/* Timer state variables */
let timerInterval = null;   /* reference to the active setInterval */
let timerRunning = false;
let totalSeconds = 25 * 60; /* default: 25 minutes */
let remainingSeconds = totalSeconds;
let startTimestamp = null;   /* Date.now() at last Start press */

/* DOM references for the timer */
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const goalInput = document.getElementById('goal-input');
const goalConfirm = document.getElementById('goal-confirm');


/*
   setDuration(mins)
   Access via the preset buttons (25 / 45 / 60 minutes).
   This function is only available when the timer is not running, to prevent users from changing the duration whilst the timer is running, thereby avoiding confusion.
 */
function setDuration(mins) {
    if (timerRunning) return; /* ignore clicks during an active session */

    totalSeconds = mins * 60;
    remainingSeconds = totalSeconds;
    updateTimerDisplay(remainingSeconds);

    /* Update the active preset button highlight */
    document.querySelectorAll('.preset-btn').forEach(function (btn) {
        btn.classList.toggle('active', parseInt(btn.dataset.mins) === mins);
    });
}


/*
   startTimer()
   Switch between ‘Start’, ‘Pause’ and ‘Resume’ states.
   When starting or resuming: Start the countdown and play the video; with a single click, the music and timer remain synchronised.
   When paused: Reset the countdown and pause the video, ensuring that audio does not continue to play whilst the timer is paused.
   In all three cases, the Play/Pause button icon updates to reflect the video’s current status.
 */
function startTimer() {
    if (!timerRunning) {
        /* Start or Resume */
        timerRunning = true;
        startBtn.textContent = 'Pause';

        /* Auto-play the video when the study session begins.
           The play/pause icon is updated to match the new state. */
        video.play();
        playPauseImg.src = 'https://img.icons8.com/ios-glyphs/30/pause--v1.png';
        playPauseImg.alt = 'Pause';

        /* Display the learning objectives as a confirmation message. */
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
        /*  Pause  */
        timerRunning = false;
        startBtn.textContent = 'Resume';
        clearInterval(timerInterval);
        timerInterval = null;

        /* Pause the video using the timer */
        video.pause();
        playPauseImg.src = 'https://img.icons8.com/ios-glyphs/30/play--v1.png';
        playPauseImg.alt = 'Play';
    }
}


/*
   resetTimer()
   Stop the timer, clear the elapsed time, and reset the display to the currently selected duration. Clear the confirmation message at the same time.
 */
function resetTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    timerInterval = null;
    remainingSeconds = totalSeconds;
    startBtn.textContent = 'Start';
    goalConfirm.textContent = '';
    updateTimerDisplay(remainingSeconds);
}


/*
   updateTimerDisplay(seconds)
   Format the remaining seconds as “mm:ss” and write them to the Nix numeric component. The `formatTime()` function follows the implementation used in the media player
 */
function updateTimerDisplay(seconds) {
    timerDisplay.textContent = formatTime(seconds);
}


/*
   handleTimerEnd()
   Called when the countdown reaches zero. Clears the interval, resets the running status, and alerts the user. Interrupts the user’s current action and requires the user to confirm.
 */
function handleTimerEnd() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
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
