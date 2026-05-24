// Инициализация Firebase. Конфиг приходит из переменных окружения (.env.local).
// Эти ключи безопасно публиковать в клиентском коде — доступ ограничен правилами Firestore.

import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Mindes] Firebase config не найден. Скопируйте .env.example в .env.local и заполните своими ключами."
  );
}

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Сохраняем сессию между перезапусками. На Capacitor работает indexedDB, в браузере — localStorage.
setPersistence(auth, indexedDBLocalPersistence).catch(() =>
  setPersistence(auth, browserLocalPersistence).catch(() => {})
);

// Firestore с локальным кешем — приложение продолжает работать оффлайн.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
