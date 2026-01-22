import { ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlogVideoEmbedProps {
  uploadedVideo?: string | null;
  videoPoster?: string | null;
  videoUrl?: string | null;
}

export function BlogVideoEmbed({ uploadedVideo, videoPoster, videoUrl }: BlogVideoEmbedProps) {
  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
  };

  const getVideoMimeType = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.webm')) return 'video/webm';
    if (lowerUrl.includes('.mp4')) return 'video/mp4';
    if (lowerUrl.includes('.mov')) return 'video/quicktime';
    return 'video/mp4';
  };

  if (uploadedVideo) {
    const mimeType = getVideoMimeType(uploadedVideo);
    const cleanUrl = uploadedVideo.trim();

    return (
      <div className="my-8 space-y-3">
        <div className="relative group">
          <video
            controls
            className="w-full rounded-xl shadow-lg bg-black"
            preload="metadata"
            playsInline
            poster={videoPoster || undefined}
            style={{ minHeight: '200px' }}
          >
            <source src={cleanUrl} type={mimeType} />
            <p className="text-center p-4">
              Your browser doesn't support HTML video.
            </p>
          </video>
          
          {/* Play overlay when poster is shown */}
          {videoPoster && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-primary-foreground ml-1" />
              </div>
            </div>
          )}
        </div>
        
        {/* Always show direct link as backup */}
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <a href={cleanUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open video in new tab
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (videoUrl) {
    const embedUrl = getEmbedUrl(videoUrl);
    if (embedUrl) {
      return (
        <div className="my-8 aspect-video">
          <iframe
            src={embedUrl}
            className="w-full h-full rounded-xl shadow-lg"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }
  }

  return null;
}
