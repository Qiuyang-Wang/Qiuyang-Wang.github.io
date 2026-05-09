/* ============================================================
   DJ MIX PLAYER — script.js

   This file handles all interactivity for the media player.
   The functions are kept small and focused — each one does
   exactly one job — so the code is easy to read and debug.

   Functions in this file:
   - togglePlayPause()   — play or pause the video
   - updateProgress()    — keep the progress bar in sync with playback
   - seekVideo()         — jump to a position when the progress bar is clicked
   - setVolume()         — update volume from the range slider
   - toggleMute()        — mute and unmute the video
   - formatTime()        — convert seconds into mm:ss string
   - updateTimeDisplay() — refresh the time readout
   - initVisualiser()    — set random animation speeds on waveform bars

   Source credit: MDN Web Docs — HTMLMediaElement API
   https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
============================================================ */


/* ---- Get references to DOM elements ---- */
const video       = document.getElementById('custom-video-player');
const playPauseImg = document.getElementById('play-pause-img');
const progressFill = document.getElementById('progress-bar-fill');
const progressBar  = document.getElementById('progress-bar');
const timeDisplay  = document.getElementById('time-display');
const volumeSlider = document.getElementById('volume-slider');
const muteImg      = document.getElementById('mute-img');
const visualiser   = document.getElementById('visualiser');


/* ============================================================
   togglePlayPause()
   Called by the play/pause button's onclick attribute.
   It checks whether the video is currently paused; if it is,
   it plays the video and swaps the icon to the pause icon.
   If the video is playing, it pauses and shows the play icon.
   The visualiser class is also toggled here so the waveform
   animation matches the playback state.
============================================================ */
function togglePlayPause() {
    if (video.paused) {
        video.play();
        playPauseImg.src = 'https://img.icons8.com/ios-glyphs/30/pause--v1.png';
        playPauseImg.alt = 'Pause Button';
        visualiser.classList.remove('paused');
    } else {
        video.pause();
        playPauseImg.src = 'https://img.icons8.com/ios-glyphs/30/play--v1.png';
        playPauseImg.alt = 'Play Button';
        visualiser.classList.add('paused');
    }
}


/* ============================================================
   updateProgress()
   This function runs every time the video fires a 'timeupdate'
   event (roughly every 250ms during playback).
   It calculates what percentage of the video has played and
   sets the width of the progress bar fill to that percentage.
   It also calls updateTimeDisplay() to keep the time readout fresh.
============================================================ */
function updateProgress() {
    if (video.duration) {
        const percent = (video.currentTime / video.duration) * 100;
        progressFill.style.width = percent + '%';
        updateTimeDisplay();
    }
}


/* ============================================================
   seekVideo(event)
   Called when the user clicks anywhere on the progress bar.
   It uses event.offsetX (the click position in pixels relative
   to the bar) divided by progressBar.offsetWidth (the total
   bar width in pixels) to get a 0–1 fraction.
   That fraction is multiplied by video.duration to get the
   target time in seconds, which is then assigned to
   video.currentTime to jump the video to that position.
============================================================ */
function seekVideo(event) {
    const clickX    = event.offsetX;
    const barWidth  = progressBar.offsetWidth;
    const fraction  = clickX / barWidth;
    video.currentTime = fraction * video.duration;
}


/* ============================================================
   setVolume(value)
   Called by the volume slider's oninput attribute.
   The slider has a min of 0 and max of 1 (step 0.01),
   so its value maps directly onto video.volume.
   When volume is changed, any existing mute is cleared so the
   user does not get confused by silent audio despite a high slider.
============================================================ */
function setVolume(value) {
    video.volume = value;
    /* If the user drags the slider up from zero, un-mute the video */
    if (value > 0 && video.muted) {
        video.muted = false;
        muteImg.src = 'https://img.icons8.com/ios-glyphs/30/speaker--v1.png';
        muteImg.alt = 'Speaker';
    }
}


/* ============================================================
   toggleMute()
   Called by the mute button's onclick attribute.
   It flips video.muted between true and false and swaps
   the button icon to give the user clear visual feedback.
   The volume slider value is not changed — when the user
   un-mutes, the volume returns to wherever the slider was.
============================================================ */
function toggleMute() {
    if (video.muted) {
        video.muted = false;
        muteImg.src = 'https://img.icons8.com/ios-glyphs/30/speaker--v1.png';
        muteImg.alt = 'Speaker (unmuted)';
    } else {
        video.muted = true;
        muteImg.src = 'https://img.icons8.com/ios-glyphs/30/mute--v1.png';
        muteImg.alt = 'Speaker (muted)';
    }
}


/* ============================================================
   toggleFullscreen()
   Called by the fullscreen button's onclick attribute.
   It uses the Fullscreen API to make the video element fill
   the screen. Different browsers use different vendor-prefixed
   methods (webkit for Safari), so both are checked.
   Source: MDN — Fullscreen API
   https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
============================================================ */
function toggleFullscreen() {
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    }
}


/* ============================================================
   formatTime(seconds)
   A small helper that converts a raw seconds number into a
   human-readable mm:ss string (e.g. 83 → "1:23").
   Math.floor is used throughout to avoid showing decimals.
============================================================ */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    /* padStart(2, '0') adds a leading zero if secs < 10 */
    return mins + ':' + String(secs).padStart(2, '0');
}


/* ============================================================
   updateTimeDisplay()
   Reads video.currentTime and video.duration, formats both
   with formatTime(), and writes them into the #time-display span.
   Called from updateProgress() every timeupdate event.
============================================================ */
function updateTimeDisplay() {
    const current  = formatTime(video.currentTime);
    const duration = video.duration ? formatTime(video.duration) : '0:00';
    timeDisplay.textContent = current + ' / ' + duration;
}


/* ============================================================
   initVisualiser()
   This function runs once on page load.
   It loops through every .bar element inside the visualiser and
   assigns a random animation-duration (between 0.3s and 0.9s)
   and a random animation-delay (between 0s and 0.5s).
   It also sets a CSS custom property --bar-max on each bar,
   which the @keyframes animation uses as the peak height.
   Random peak heights (between 20px and 56px) ensure the bars
   look organic and uneven rather than all peaking together.

   This technique combines CSS custom properties with JavaScript
   randomisation to produce an effect that would be very repetitive
   if hard-coded in CSS.
============================================================ */
function initVisualiser() {
    const bars = visualiser.querySelectorAll('.bar');
    bars.forEach(function(bar) {
        const duration = (Math.random() * 0.6 + 0.3).toFixed(2) + 's';
        const delay    = (Math.random() * 0.5).toFixed(2) + 's';
        const maxH     = Math.floor(Math.random() * 36 + 20) + 'px';
        bar.style.animationDuration = duration;
        bar.style.animationDelay   = delay;
        bar.style.setProperty('--bar-max', maxH);
    });
    /* Start in paused state — bars are flat until user presses play */
    visualiser.classList.add('paused');
}


/* ---- Event Listeners ---- */

/* timeupdate fires continuously during playback ~4 times per second */
video.addEventListener('timeupdate', updateProgress);

/* When the video metadata loads, show the total duration immediately */
video.addEventListener('loadedmetadata', updateTimeDisplay);

/* When the video ends naturally, reset the play button and flatten bars */
video.addEventListener('ended', function() {
    playPauseImg.src = 'https://img.icons8.com/ios-glyphs/30/play--v1.png';
    playPauseImg.alt = 'Play Button';
    visualiser.classList.add('paused');
});


/* ---- Initialise ---- */
initVisualiser();
