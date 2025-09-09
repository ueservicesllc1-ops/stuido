'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  DocumentData,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const [newItem, setNewItem] = useState('');
  const [items, setItems] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);

  const itemsCollectionRef = collection(db, 'items');

  const getItems = useCallback(() => {
    const q = query(itemsCollectionRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(itemsData);
    });
    return unsubscribe;
  }, [itemsCollectionRef]);

  useEffect(() => {
    const unsubscribe = getItems();
    return () => unsubscribe();
  }, [getItems]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim() === '') return;
    setLoading(true);
    try {
      await addDoc(itemsCollectionRef, {
        name: newItem,
        createdAt: new Date(),
      });
      setNewItem('');
    } catch (error) {
      console.error('Error adding document: ', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Mi Lista de Tareas</CardTitle>
          <CardDescription>
            Agrega un nuevo elemento a tu lista en Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addItem} className="flex gap-2">
            <Input
              type="text"
              placeholder="Nueva tarea..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || newItem.trim() === ''}>
              {loading ? 'Agregando...' : 'Agregar'}
            </Button>
          </form>
          <Separator className="my-4" />
          <h3 className="text-lg font-semibold mb-2">Tareas Pendientes</h3>
          <ScrollArea className="h-60 w-full rounded-md border p-4">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="py-2">
                  {item.name}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                No hay tareas. ¡Agrega una!
              </p>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Datos guardados en tiempo real con Firebase Firestore.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
