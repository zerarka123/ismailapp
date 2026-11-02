// Back button: go back in history when there is a previous page inside the app; a page opened from a shared
// link has no history, so go to the home screen instead of doing nothing.
export const goBack = (nav) => {
  if ((window.history.state?.idx ?? 0) > 0) nav(-1);
  else nav('/', { replace: true });
};
