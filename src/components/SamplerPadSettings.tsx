
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, AudioLines } from 'lucide-react';

const topRowKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
const bottomRowKeys = ['1', '2', '3', '4', '5', '6'];

const SamplerPadSettings = () => {
    const [selectedGroup, setSelectedGroup] = useState<string>('A');

    const handleFileSelect = (group: string, pad: string) => {
        // Lógica para abrir el selector de archivos
        console.log(`Seleccionando archivo para Grupo ${group}, Pad ${pad}`);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración del Sampler Pad</CardTitle>
                <CardDescription>
                    Sube y asigna archivos de audio a cada uno de los pads. Organiza tus sonidos en 6 grupos (A-F), cada uno con 6 pads (1-6).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-6">
                    <div>
                        <h3 className="text-lg font-medium mb-2">Seleccionar Grupo</h3>
                        <div className="grid grid-cols-6 gap-2">
                            {topRowKeys.map((key) => (
                                <Button
                                    key={key}
                                    variant={selectedGroup === key ? 'default' : 'secondary'}
                                    onClick={() => setSelectedGroup(key)}
                                    className="h-12 text-lg"
                                >
                                    {key}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div>
                         <h3 className="text-lg font-medium mb-4">Pads del Grupo <span className="text-primary">{selectedGroup}</span></h3>
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                            {bottomRowKeys.map((padKey) => (
                                <div key={padKey} className="p-4 bg-secondary/50 rounded-lg border border-border">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold">Pad {padKey}</h4>
                                        <Button size="icon" variant="ghost" className="w-8 h-8">
                                            <AudioLines className="w-5 h-5 text-muted-foreground" />
                                        </Button>
                                    </div>
                                    <Input
                                        type="text"
                                        placeholder="Nombre del sample"
                                        className="mb-2 bg-input"
                                    />
                                    <Button className="w-full gap-2" variant="outline">
                                        <Upload className="w-4 h-4" />
                                        Subir Audio
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SamplerPadSettings;
