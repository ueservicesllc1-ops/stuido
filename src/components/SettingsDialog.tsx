
'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { ChevronRight, X, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClickSound } from '@/app/page';

type SettingsTab = 'General' | 'MIDI' | 'Audio' | 'Loop Connect™' | 'Prime MD™' | 'About';
type GeneralSettingsView = 'main' | 'click-sound';

interface SettingsRowProps {
  label: string;
  value: string | React.ReactNode;
  onClick?: () => void;
  isSelect?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ label, value, onClick, isSelect }) => (
  <div className="flex items-center justify-between py-3 cursor-pointer" onClick={onClick}>
    <Label className="text-base cursor-pointer">{label}</Label>
    <div className="flex items-center gap-2 text-muted-foreground">
      <span>{value}</span>
      {isSelect && <ChevronRight className="h-5 w-5" />}
    </div>
  </div>
);

interface SettingsSelectionRowProps {
    label: string;
    isSelected: boolean;
    onClick: () => void;
}

const SettingsSelectionRow: React.FC<SettingsSelectionRowProps> = ({ label, isSelected, onClick }) => (
    <div className="flex items-center justify-between py-3 cursor-pointer" onClick={onClick}>
        <Label className="text-base cursor-pointer">{label}</Label>
        {isSelected && <Check className="h-5 w-5 text-primary" />}
    </div>
);


interface SettingsSliderRowProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  displayFormatter?: (value: number) => string;
}

const SettingsSliderRow: React.FC<SettingsSliderRowProps> = ({ label, value, onValueChange, displayFormatter }) => (
  <div className="py-3">
    <div className="flex items-center justify-between mb-2">
        <Label className="text-base">{label}</Label>
        <span className="text-muted-foreground">{displayFormatter ? displayFormatter(value) : value}</span>
    </div>
    <Slider
      defaultValue={[value]}
      max={5} // Max 5 segundos de fade
      step={0.1}
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

interface SettingsDialogProps {
    children: React.ReactNode;
    clickSound: ClickSound;
    onClickSoundChange: (sound: ClickSound) => void;
    fadeOutDuration: number;
    onFadeOutDurationChange: (duration: number) => void;
}


const SettingsDialog = ({ children, clickSound, onClickSoundChange, fadeOutDuration, onFadeOutDurationChange }: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('General');
  const [generalView, setGeneralView] = useState<GeneralSettingsView>('main');
  const [transition, setTransition] = useState(12);
  const [tonicFollows, setTonicFollows] = useState(true);

  const tabs: SettingsTab[] = ['General', 'MIDI', 'Audio', 'Loop Connect™', 'Prime MD™', 'About'];

  const renderGeneralSettings = () => {
    switch (generalView) {
        case 'click-sound':
            return (
                 <div>
                    <div className="relative flex items-center justify-center mb-4">
                        <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => setGeneralView('main')}>
                            <ChevronLeft />
                        </Button>
                        <h3 className="font-semibold text-lg">Click Sound</h3>
                    </div>
                    <Separator />
                    <SettingsSelectionRow 
                        label="Beep" 
                        isSelected={clickSound === 'beep'} 
                        onClick={() => {
                            onClickSoundChange('beep');
                            setGeneralView('main');
                        }}
                    />
                    <Separator />
                    <SettingsSelectionRow 
                        label="Click" 
                        isSelected={clickSound === 'click'}
                        onClick={() => {
                            onClickSoundChange('click');
                            setGeneralView('main');
                        }}
                    />
                    <Separator />
                </div>
            );
        case 'main':
        default:
            return (
                <div>
                    <SettingsRow label="Appearance" value="Dark" isSelect />
                    <Separator />
                    <SettingsRow label="Click Sound" value={clickSound === 'beep' ? 'Beep' : 'Click'} isSelect onClick={() => setGeneralView('click-sound')} />
                    <Separator />
                    <SettingsSliderRow 
                      label="Fade out / in duration" 
                      value={fadeOutDuration} 
                      onValueChange={onFadeOutDurationChange}
                      displayFormatter={(value) => `${value.toFixed(1)}s`}
                    />
                    <Separator />
                    <SettingsSliderRow label="Transition Duration" value={transition} onValueChange={setTransition} />
                    <Separator />
                    <SettingsRow label="Pan" value="" />
                    <Separator />
                    <SettingsSwitchRow label="Tonic Pad follows Key of Tracks" checked={tonicFollows} onCheckedChange={setTonicFollows} />
                    <Separator />
                </div>
            );
    }
  }

  return (
    <Sheet onOpenChange={(isOpen) => {
        if (!isOpen) {
            // Reset views when closing the sheet
            setActiveTab('General');
            setGeneralView('main');
        }
    }}>
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
                            onClick={() => {
                                setActiveTab(tab);
                                setGeneralView('main'); // Reset sub-view when changing tabs
                            }}
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
                       {renderGeneralSettings()}
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

    