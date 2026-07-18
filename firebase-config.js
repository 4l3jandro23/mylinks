// Pega aquí la configuración que te da Firebase (Project settings → Tus apps → Web).
// Mientras apiKey sea "REPLACE_ME", la app funciona en modo local (sin sincronizar).
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";
