import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type BusinessSettings = {
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
    footerText?: string;
};

const SETTINGS_DOC_ID = "business";
const COLLECTION_NAME = "settings";

export async function getSettings(): Promise<BusinessSettings | null> {
    const snap = await getDoc(doc(db, COLLECTION_NAME, SETTINGS_DOC_ID));
    if (snap.exists()) {
        return snap.data() as BusinessSettings;
    }
    return null;
}

export async function saveSettings(settings: BusinessSettings): Promise<void> {
    await setDoc(doc(db, COLLECTION_NAME, SETTINGS_DOC_ID), settings);
}
