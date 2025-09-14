
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Heart, Loader2 } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useToast } from './ui/use-toast';

interface DonationDialogProps {
  children: React.ReactNode;
}

const PAYPAL_CLIENT_ID = "AfU-04zHwad560P4nU6LVMd7qnrY41c0TOdA9LUbN_6-lmztaHfxJz1p7-ByIt6-uoqSGr6OcdaO3b3m";

const DonationDialog: React.FC<DonationDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const { toast } = useToast();

  const handleCreateOrder = (data: any, actions: any) => {
    setIsProcessing(true);
    // Fijo un valor de donación, ej: $5.00. Esto puede hacerse dinámico.
    return actions.order.create({
      purchase_units: [
        {
          description: "Donación para el proyecto Multitrack Player",
          amount: {
            currency_code: "USD",
            value: "5.00",
          },
        },
      ],
    });
  };

  const handleOnApprove = (data: any, actions: any) => {
    return actions.order.capture().then((details: any) => {
      toast({
        title: "¡Gracias por tu donación!",
        description: `Tu apoyo como ${details.payer.name.given_name} es muy apreciado.`,
      });
      setIsProcessing(false);
      setOpen(false);
    });
  };

  const handleError = (err: any) => {
    toast({
      variant: 'destructive',
      title: 'Error en la donación',
      description: 'Ocurrió un error al procesar el pago. Por favor, inténtalo de nuevo.',
    });
    console.error('Error de PayPal:', err);
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-destructive fill-destructive" />
            Apoya este Proyecto
          </DialogTitle>
          <DialogDescription>
            Si encuentras útil esta aplicación, considera hacer una pequeña donación para apoyar su desarrollo continuo. ¡Cada contribución ayuda!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD", intent: "capture" }}>
            <div className="relative min-h-[100px]">
              {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
              )}
              <PayPalButtons
                style={{ layout: "vertical", color: "gold", shape: "rect", label: "donate" }}
                onInit={() => setIsProcessing(false)}
                createOrder={handleCreateOrder}
                onApprove={handleOnApprove}
                onError={handleError}
                onCancel={() => setIsProcessing(false)}
              />
            </div>
          </PayPalScriptProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationDialog;
