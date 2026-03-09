import { Auth } from './services/auth.js';
import { initAdmin } from './controllers/adminController.js';

const user = Auth.getCurrentUser();
if (!user || user.rol === 'Usuario') {
    window.location.href = 'index.html';
}

window.logout = Auth.logout;

document.addEventListener('DOMContentLoaded', () => {
    // Pasar el usuario al controlador
    initAdmin(user);
});