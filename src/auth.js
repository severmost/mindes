// Универсальный Google Sign-In: одинаковый интерфейс для веба и Android (Capacitor).
// На вебе используем popup из Firebase JS SDK.
// На Android — нативный Google Sign-In через @capacitor-firebase/authentication,
// затем обмениваем idToken на сессию JS SDK, чтобы Firestore работал одинаково.

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";
import { isNative } from "./platform";

export async function signInWithGoogle() {
  if (isNative()) {
    // Динамический импорт, чтобы web-сборка не тащила нативный плагин.
    const { FirebaseAuthentication } = await import(
      "@capacitor-firebase/authentication"
    );
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result?.credential?.idToken;
    if (!idToken) throw new Error("Google Sign-In: idToken не получен");
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    return auth.currentUser;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut() {
  if (isNative()) {
    try {
      const { FirebaseAuthentication } = await import(
        "@capacitor-firebase/authentication"
      );
      await FirebaseAuthentication.signOut();
    } catch {
      // если нативный плагин не отвечает — продолжаем выходить из JS SDK
    }
  }
  await fbSignOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
