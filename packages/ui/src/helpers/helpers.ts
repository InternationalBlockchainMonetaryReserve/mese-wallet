/**
 * @license
 * Copyright 2020
 * =========================================
 */

///
/// Handle any resized window (usually happens on Windows) and fullscreen on Mac
export function windowPopup() {
    return {
        width: window.innerWidth > 400 ? 400 : window.innerWidth,
        height: window.innerHeight > 625 ? 600 : window.innerHeight,
    }
} 

export function disableBackGesture() {
     // Forbid horizontal scrolling, to prevent going back
     window.addEventListener("wheel", function(event) {
        // Vertical Scrolling
        if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
          return
        }
        // Horizontal Scrolling
        event.preventDefault()
      }, { passive: false })
}