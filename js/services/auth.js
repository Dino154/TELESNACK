import { DataService } from './dataService.js';

export const Auth = {
    // Convertimos login en async porque DataService.login lo es
    login: async (user, pin) => {
        try {
            const foundUser = await DataService.login(user, pin);
            
            // --- AGREGADO: GUARDAR SESIÓN PARA QUE NO TE PIDA LOGIN A CADA RATO ---
            if (foundUser) {
                localStorage.setItem('ts_user', JSON.stringify(foundUser));
            }
            // ---------------------------------------------------------------------

            return foundUser; 
        } catch (error) {
            console.error("Error en Auth:", error);
            return null;
        }
    },
    
    getCurrentUser: () => {
        const userStr = localStorage.getItem('ts_user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    },

    setUser: (user) => {
        localStorage.setItem('ts_user', JSON.stringify(user));
    },

    logout: () => {
        // Limpiamos la sesión
        localStorage.removeItem('ts_user');
        sessionStorage.clear(); // Por si acaso tienes algo más guardado ahí
        
        // --- SOLUCIÓN DEL BOTÓN ATRÁS: USAR REPLACE EN LUGAR DE HREF ---
        window.location.replace('index.html');
    }
};