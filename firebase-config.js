// Pega aquí la configuración que te da Firebase (Project settings → Tus apps → Web).
// Mientras apiKey sea "REPLACE_ME", la app funciona en modo local (sin sincronizar).
export const firebaseConfig = {
  apiKey: "AIzaSyDewYS-vHaHiNedCfvgJyLsXAgctF8Zcmg",
  authDomain: "mylinks-71fdb.firebaseapp.com",
  projectId: "mylinks-71fdb",
  storageBucket: "mylinks-71fdb.firebasestorage.app",
  messagingSenderId: "197126785189",
  appId: "1:197126785189:web:30069c2894e9496e37e54c",
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";
