let pending = false;
export function triggerUserTour() {
  pending = true;
  window.dispatchEvent(new Event("moodify-start-tour"));
}
export function takePendingUserTour() {
  const value = pending;
  pending = false;
  return value;
}
