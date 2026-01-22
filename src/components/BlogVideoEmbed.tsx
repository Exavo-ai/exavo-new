interface BlogVideoEmbedProps {
  uploadedVideo?: string | null;
  videoUrl?: string | null;
}

export function BlogVideoEmbed({ uploadedVideo, videoUrl }: BlogVideoEmbedProps) {
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

  if (uploadedVideo) {
    return (
      <div className="my-8">
        <video
          src={uploadedVideo}
          controls
          className="w-full rounded-xl shadow-lg"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
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
