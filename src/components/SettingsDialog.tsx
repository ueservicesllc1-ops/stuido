
'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab = 'General' | 'MIDI' | 'Audio' | 'Loop Connect™' | 'Prime MD™' | 'About';

interface SettingsRowProps {
  label: string;
  value: string | React.ReactNode;
  onClick?: () => void;
  isSelect?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ label, value, onClick, isSelect }) => (
  <div className="flex items-center justify-between py-3" onClick={onClick}>
    <Label className="text-base">{label}</Label>
    <div className="flex items-center gap-2 text-muted-foreground">
      <span>{value}</span>
      {isSelect && <ChevronRight className="h-5 w-5" />}
    </div>
  </div>
);

interface SettingsSliderRowProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
}

const SettingsSliderRow: React.FC<SettingsSliderRowProps> = ({ label, value, onValueChange }) => (
  <div className="py-3">
    <div className="flex items-center justify-between mb-2">
        <Label className="text-base">{label}</Label>
        <span className="text-muted-foreground">{value}</span>
    </div>
    <Slider
      defaultValue={[value]}
      max={20}
      step={1}
      onValueChange={(vals) => onValueChange(vals[0])}
    />
  </div>
);

interface SettingsSwitchRowProps {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

const SettingsSwitchRow: React.FC<SettingsSwitchRowProps> = ({ label, checked, onCheckedChange }) => (
    <div className="flex items-center justify-between py-3">
        <Label className="text-base">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
);


const SettingsDialog = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('General');
  const [fadeOut, setFadeOut] = useState(10);
  const [transition, setTransition] = useState(12);
  const [tonicFollows, setTonicFollows] = useState(true);

  const tabs: SettingsTab[] = ['General', 'MIDI', 'Audio', 'Loop Connect™', 'Prime MD™', 'About'];

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="left"
        className="w-full h-full max-w-full sm:max-w-full md:max-w-full lg:max-w-full xl:max-w-full p-0"
      >
        <div className="grid grid-cols-[280px_1fr] h-full">
            {/* Left Nav */}
            <div className="bg-secondary/30 flex flex-col h-full">
                <SheetHeader className="p-4 text-left">
                    <SheetTitle className="text-4xl font-bold flex items-center justify-between">
                        Settings
                        <SheetClose asChild>
                            <Button variant="ghost" size="icon" className="rounded-full w-10 h-10">
                                <X className="w-5 h-5"/>
                            </Button>
                        </SheetClose>
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col p-4 flex-grow">
                    {tabs.map(tab => (
                        <Button 
                            key={tab}
                            variant="ghost" 
                            className={cn(
                                "justify-start text-lg h-12 px-4",
                                activeTab === tab && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            )}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </Button>
                    ))}
                    <Button variant="destructive" className="mt-auto h-12 text-lg">Log out</Button>
                </div>
            </div>

            {/* Right Content */}
            <div className="p-8 overflow-y-auto">
                {activeTab === 'General' && (
                    <div className="max-w-md mx-auto">
                        <SettingsRow label="Cue Sound" value="Matt McCoy" isSelect />
                        <Separator />
                        <SettingsRow label="Click Sound" value="Beep" isSelect />
                        <Separator />
                        <SettingsRow label="Appearance" value="Dark" isSelect />
                        <Separator />
                        <SettingsSliderRow label="Fade out / in duration" value={fadeOut} onValueChange={setFadeOut} />
                        <Separator />
                        <SettingsSliderRow label="Transition Duration" value={transition} onValueChange={setTransition} />
                        <Separator />
                        <SettingsRow label="Pan" value="" />
                        <Separator />
                        <SettingsSwitchRow label="Tonic Pad follows Key of Tracks" checked={tonicFollows} onCheckedChange={setTonicFollows} />
                        <Separator />
                    </div>
                )}
                 {activeTab !== 'General' && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground text-2xl">Settings for {activeTab}</p>
                    </div>
                )}
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDialog;
