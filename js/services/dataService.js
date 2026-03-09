// CORRECCIÓN VITAL: './firebase.js' (con un solo punto) porque están en la misma carpeta
import { db, collection, getDocs, addDoc, updateDoc, doc, query, where, runTransaction } from './firebase.js';

export const DataService = {
    
    // --- USUARIOS ---
    async login(user, pin) {
        try {
            const q = query(
                collection(db, "usuarios"), 
                where("user", "==", user),
                where("pin", "==", pin),
                where("activo", "==", true)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            const docData = snapshot.docs[0];
            return { id: docData.id, ...docData.data() };
        } catch (error) {
            console.error("Error en login:", error);
            return null;
        }
    },

    async getUsuarios(sede) {
        try {
            let q;
            if (sede === 'Global') {
                q = collection(db, "usuarios");
            } else {
                q = query(collection(db, "usuarios"), where("sede", "==", sede));
            }
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obteniendo usuarios:", error);
            return [];
        }
    },

    async crearUsuario(usuarioData) {
        try {
            const docRef = await addDoc(collection(db, "usuarios"), usuarioData);
            return { id: docRef.id, ...usuarioData };
        } catch (error) {
            console.error("Error creando usuario:", error);
            throw error;
        }
    },

    async actualizarUsuario(id, data) {
        try {
            const userRef = doc(db, "usuarios", id);
            await updateDoc(userRef, data);
            return true;
        } catch (error) {
            console.error("Error actualizando usuario:", error);
            throw error;
        }
    },

    // --- INVENTARIO ---
    async getInventario(sede) {
        try {
            let q;
            if (sede && sede !== 'Global') {
                q = query(collection(db, "inventario"), where("sede", "==", sede));
            } else {
                q = collection(db, "inventario");
            }
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obteniendo inventario:", error);
            return [];
        }
    },

    async crearProducto(productoData) {
        try {
            const docRef = await addDoc(collection(db, "inventario"), productoData);
            return { id: docRef.id, ...productoData };
        } catch (error) {
            console.error("Error creando producto:", error);
            throw error;
        }
    },

    async actualizarProducto(id, data) {
        try {
            const prodRef = doc(db, "inventario", id);
            await updateDoc(prodRef, data);
            return true;
        } catch (error) {
            console.error("Error actualizando producto:", error);
            throw error;
        }
    },

    // --- VENTAS (KARDEX) ---
    async getVentas(sede) {
        try {
            let q;
            if (sede && sede !== 'Global') {
                q = query(collection(db, "ventas"), where("sede", "==", sede));
            } else {
                q = collection(db, "ventas");
            }
            const snapshot = await getDocs(q);
            const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); 
        } catch (error) {
            console.error("Error obteniendo ventas:", error);
            return [];
        }
    },

    // --- ¡ESTA ES LA ÚNICA FUNCIÓN NUEVA AGREGADA AL FINAL! ---
    async calcularDeudaUsuario(nombreUsuario) {
        try {
            const q = query(
                collection(db, "ventas"), 
                where("user", "==", nombreUsuario),
                where("metodo", "==", "Pendiente")
            );
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) return 0;

            // Sumamos el total de todo lo que debe
            const totalDeuda = snapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
            return totalDeuda;
        } catch (error) {
            console.error("Error calculando deuda:", error);
            return 0; 
        }
    },

    async registrarVenta(venta) {
        try {
            await runTransaction(db, async (transaction) => {
                const itemsRefs = [];
                for (const item of venta.items) {
                    const q = query(
                        collection(db, "inventario"), 
                        where("nombre", "==", item.nombre),
                        where("sede", "==", venta.sede)
                    );
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                        itemsRefs.push({
                            ref: doc(db, "inventario", snapshot.docs[0].id),
                            cantidad: item.cantidad,
                            nombre: item.nombre,
                            stockActual: snapshot.docs[0].data().stock
                        });
                    }
                }

                for (const item of itemsRefs) {
                    if (item.stockActual < item.cantidad) {
                        throw new Error(`Stock insuficiente para ${item.nombre}`);
                    }
                }

                for (const item of itemsRefs) {
                    const nuevoStock = item.stockActual - item.cantidad;
                    transaction.update(item.ref, { stock: nuevoStock });
                }

                const ventasRef = collection(db, "ventas");
                const nuevaVentaRef = doc(ventasRef);
                transaction.set(nuevaVentaRef, venta);
            });
            return true;
        } catch (error) {
            console.error("Error en transacción de venta:", error);
            throw error; 
        }
    },

    async actualizarVenta(id, nuevosDatos) {
        try {
            const ventaRef = doc(db, "ventas", id);
            await updateDoc(ventaRef, nuevosDatos);
            return true;
        } catch (error) {
            console.error("Error actualizando venta:", error);
            throw error;
        }
    }
};