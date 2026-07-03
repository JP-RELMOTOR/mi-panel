import { initializeApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'
import { getAuth, type Auth } from 'firebase/auth'
import { FIREBASE_CONFIG, nubeConfigurada } from './firebaseConfig'

// Raíz del árbol de datos en Realtime Database
export const RAIZ = 'salud'

let _db: Database | null = null
let _auth: Auth | null = null

if (nubeConfigurada()) {
  try {
    const app = initializeApp(FIREBASE_CONFIG)
    _db = getDatabase(app)
    _auth = getAuth(app)
  } catch (e) {
    console.error('No se pudo iniciar Firebase:', e)
    _db = null
    _auth = null
  }
}

export const db = _db
export const auth = _auth
export const hayNube = () => _db !== null
