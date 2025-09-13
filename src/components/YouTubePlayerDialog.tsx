
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface YouTubePlayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  songTitle: string;
}

const getYouTubeEmbedUrl = (url: string | null): string | null => {
  if (!url) return null;

  let videoId: string | null = null;
  
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('youtube.com/watch?v=')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    videoId = urlParams.get('v');
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  
  return null; // Return null if the URL is not a valid YouTube URL
};


const YouTubePlayerDialog: React.FC<YouTubePlayerDialogProps> = ({ isOpen, onClose, videoUrl, songTitle }) => {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-4 flex-row flex justify-between items-center">
          <DialogTitle>{songTitle}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="flex-grow w-full h-full">
            {embedUrl ? (
                <iframe
                    width="100%"
                    height="100%"
                    src={embedUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="rounded-b-lg"
                ></iframe>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>URL de YouTube no válida o no proporcionada.</p>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubePlayerDialog;
