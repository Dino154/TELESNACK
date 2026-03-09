import { Auth } from './services/auth.js';
import { initShop } from './controllers/shopController.js';

// Seguridad
const user = Auth.getCurrentUser();
if (!user || user.rol !== 'Usuario') {
    window.location.href = 'index.html';
}

window.logout = Auth.logout;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('user-info').innerText = user.nombre;
    initShop(user);
});