// L'API visée par le logiciel organisateur (fondation Z7, 13/10/2026).
//  - `npm run dev` / `npm start` (Vite en développement) : backend de DEV,
//    http://127.0.0.1:5000/api, base de DEV, données fictives ;
//  - paquet construit (`npm run build`, `build:electron`) : la production.
// VITE_Z7_API (fichier .env.local, jamais versionné) force une autre adresse.
const PRODUCTION = 'https://z7-backend.onrender.com/api';
const DEV = 'http://127.0.0.1:5000/api';

export const API: string = import.meta.env.VITE_Z7_API || (import.meta.env.DEV ? DEV : PRODUCTION);
export const API_EST_DEV: boolean = API !== PRODUCTION;
