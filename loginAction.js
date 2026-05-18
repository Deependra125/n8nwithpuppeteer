// loginAction.js
export function injectCredentialsAndLogin(username, password) {
    var u = document.getElementById('signInName');
    var p = document.getElementById('password');
    var nextBtn = document.getElementById('next');

    if (u && p && nextBtn) {
        u.value = username;
        u.dispatchEvent(new Event('input', { bubbles: true }));
        u.dispatchEvent(new Event('change', { bubbles: true }));

        p.value = password;
        p.dispatchEvent(new Event('input', { bubbles: true }));
        p.dispatchEvent(new Event('change', { bubbles: true }));

        nextBtn.click();
        return 'submitted';
    }
    return 'missing_fields';
}
