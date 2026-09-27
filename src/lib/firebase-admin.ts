import { initializeApp, getApps, getApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function getServiceAccount(): ServiceAccount | null {
  // 1. Tenta carregar do arquivo de credenciais local na raiz do projeto
  const filename = "cardapios-para-venda-firebase-adminsdk-fbsvc-c7897985e2.json";
  const localKeyPath = path.join(process.cwd(), filename);

  if (fs.existsSync(localKeyPath)) {
    try {
      const raw = fs.readFileSync(localKeyPath, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("Erro ao ler credenciais do Firebase:", e);
    }
  }

  // 2. Fallback para variavel de ambiente FIREBASE_SERVICE_ACCOUNT (producao)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error("Erro ao parsear FIREBASE_SERVICE_ACCOUNT:", e);
    }
  }

  // 3. Fallback para variaveis individuais
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID || "cardapios-para-venda",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

export function getFirestoreDb(): Firestore {
  const apps = getApps();

  if (apps.length === 0) {
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || (serviceAccount as any).project_id || "cardapios-para-venda",
      });
    } else {
      initializeApp({
        projectId: "cardapios-para-venda",
      });
    }
  }

  return getFirestore();
}

export const firestore = getFirestoreDb;
