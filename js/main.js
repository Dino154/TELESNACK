// Importamos Auth desde la carpeta services
import { Auth } from './services/auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Redirección si ya está logueado
    const user = Auth.getCurrentUser();
    if (user) {
        // Redirige según el rol guardado en la base de datos (USANDO REPLACE)
        window.location.replace(user.rol === 'Usuario' ? 'shop.html' : 'admin.html');
        return;
    }

    // 2. Controlar el formulario
    const loginForm = document.getElementById('form-login');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // ¡Esto evita el signo '?' y la recarga!

        const btn = loginForm.querySelector('button');
        const user = document.getElementById('login-user').value.trim();
        const pin = document.getElementById('login-pin').value.trim();

        // UI Carga
        const textoOriginal = btn.innerText;
        btn.innerText = "Verificando...";
        btn.disabled = true;

        try {
            const loggedUser = await Auth.login(user, pin);

            if (loggedUser) {
                // ==========================================================
                // 🚨 NUEVO: CORTAR ACCESO SI LA CUENTA ESTÁ INACTIVA
                // ==========================================================
                if (loggedUser.activo === false) {
                    Swal.fire({ 
                        icon: 'error', 
                        title: 'Acceso Denegado', 
                        text: 'Tu cuenta ha sido deshabilitada por un administrador.' 
                    });
                    // Restauramos el botón y cortamos el inicio de sesión
                    btn.innerText = textoOriginal;
                    btn.disabled = false;
                    return; 
                }
                // ==========================================================

                // GUARDAR DATOS DEL USUARIO (Importante para que shop/admin sepan quién es)
                Auth.setUser(loggedUser);

                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: `Hola, ${loggedUser.nombre}`,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    // Redirección inteligente (USANDO REPLACE PARA NO DEJAR RASTRO EN EL HISTORIAL)
                    if (loggedUser.rol === 'Usuario') {
                        window.location.replace('shop.html');
                    } else {
                        window.location.replace('admin.html');
                    }
                });
            } else {
                throw new Error("Credenciales incorrectas");
            }
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Usuario o PIN incorrectos' });
        } finally {
            // Este bloque se ejecuta pase lo que pase (excepto si hicimos return arriba)
            if (btn.innerText === "Verificando...") {
                btn.innerText = textoOriginal;
                btn.disabled = false;
            }
        }
    });

    // --- NUEVA VALIDACIÓN: USUARIO (Solo letras minúsculas) ---
    const userInput = document.getElementById('login-user');
    if(userInput) {
        userInput.addEventListener('input', (e) => {
            // Convierte a minúsculas y elimina todo lo que NO sea una letra (a-z)
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
        });
    }

    // Filtro solo números para el PIN
    const pinInput = document.getElementById('login-pin');
    if(pinInput) {
        pinInput.addEventListener('input', (e) => e.target.value = e.target.value.replace(/\D/g, ''));
    }
});