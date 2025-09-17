
'use client';

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'fileHandleDB';
const STORE_NAME = 'fileHandles';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = (): Promise<IDBPDatabase> => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
};

// Guarda un FileSystemFileHandle en IndexedDB
export const setFileHandle = async (key: string, handle: FileSystemFileHandle): Promise<void> => {
    try {
        const db = await getDb();
        await db.put(STORE_NAME, handle, key);
        console.log(`File handle saved for key: ${key}`);
    } catch (error) {
        console.error('Error saving file handle to IndexedDB:', error);
    }
};

// Obtiene un FileSystemFileHandle de IndexedDB
export const getFileHandle = async (key: string): Promise<FileSystemFileHandle | undefined> => {
    try {
        const db = await getDb();
        const handle = await db.get(STORE_NAME, key);
        
        if (!handle) {
            // console.log(`No file handle found for key: ${key}`);
            return undefined;
        }
        
        // Verificar si todavía tenemos permiso para acceder al archivo
        const permission = await handle.queryPermission({ mode: 'read' });
        if (permission === 'granted') {
            return handle;
        }
        
        // Si no tenemos permiso, lo solicitamos de nuevo
        if (await handle.requestPermission({ mode: 'read' }) === 'granted') {
            return handle;
        }

        console.warn(`Permission denied for file handle: ${key}`);
        return undefined;

    } catch (error) {
        console.error('Error getting file handle from IndexedDB:', error);
        return undefined;
    }
};

// Elimina un FileSystemFileHandle de IndexedDB
export const deleteFileHandle = async (key: string): Promise<void> => {
    try {
        const db = await getDb();
        await db.delete(STORE_NAME, key);
        console.log(`File handle deleted for key: ${key}`);
    } catch (error) {
        console.error('Error deleting file handle from IndexedDB:', error);
    }
};

// Limpia toda la base de datos de handles
export const clearAllFileHandles = async (): Promise<void> => {
    try {
        const db = await getDb();
        await db.clear(STORE_NAME);
        console.log('All file handles cleared from IndexedDB.');
    } catch (error) {
        console.error('Error clearing file handles from IndexedDB:', error);
    }
};
