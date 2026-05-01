# Smoke check — Block 1.1 Authentication UI

Environment: `USE_MOCK = true`, dev server at http://localhost:5173

## Steps

1. Open http://localhost:5173 in the browser.
   - Expected: redirected to `/login` (not authed yet).

2. Click "Regístrate" to switch to register mode.
   - Expected: heading changes to "Crear cuenta".

3. Enter any valid email (e.g. `test@example.com`) and a password of at least 8 characters. Submit.
   - Expected: redirected to `/dashboard`. No error visible.

4. Verify the header shows the nav links "Dashboard" and "Subir factura" and the "Salir" button.

5. Click "Salir".
   - Expected: redirected to `/login`.

6. Back on `/login`, enter the same email and password. Submit.
   - Expected: redirected to `/dashboard`.

7. While logged in, navigate directly to http://localhost:5173/login.
   - Expected: immediately redirected to `/dashboard` (already authed).

8. Open DevTools → Application → Local Storage → http://localhost:5173.
   - Expected: key `ii_token` is present with a non-empty value.

9. Click "Salir".
   - Expected: redirected to `/login`. Key `ii_token` is gone from Local Storage.

10. While logged out, navigate directly to http://localhost:5173/dashboard.
    - Expected: redirected to `/login`.

## Error path

11. On the login form, enter a valid email and a password shorter than 8 characters. Try to submit.
    - Expected: browser native validation blocks submission ("Mínimo 8 caracteres" placeholder visible; minLength constraint).

12. On the login form, enter a malformed email (e.g. `notanemail`). Try to submit.
    - Expected: browser native validation blocks submission (type="email" constraint).

## Result

All steps passed on: <!-- fill in date and commit sha -->
