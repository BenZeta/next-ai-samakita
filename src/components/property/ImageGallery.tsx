'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface ImageGalleryProps {
  images: string[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
    document.body.style.overflow = 'auto';
  };

  const goToPrevious = () => {
    setSelectedImageIndex(prev => {
      if (prev === null) return null;
      return prev === 0 ? images.length - 1 : prev - 1;
    });
  };

  const goToNext = () => {
    setSelectedImageIndex(prev => {
      if (prev === null) return null;
      return prev === images.length - 1 ? 0 : prev + 1;
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (selectedImageIndex === null) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex]); // Add selectedImageIndex as dependency

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className="group relative aspect-video w-full overflow-hidden rounded-lg"
          >
            <Image
              src={image}
              alt={`Property image ${index + 1}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </button>
        ))}
      </div>

      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <button
            onClick={closeLightbox}
            className="absolute right-2 top-2 rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 sm:right-4 sm:top-4 sm:p-2"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            onClick={goToPrevious}
            className="absolute left-2 rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 sm:left-4 sm:p-2"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-2 rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 sm:right-4 sm:p-2"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <div className="relative h-[85vh] w-[95vw] sm:h-[80vh] sm:w-[90vw]">
            <Image
              src={images[selectedImageIndex]}
              alt={`Property image ${selectedImageIndex + 1}`}
              fill
              className="object-contain"
              sizes="95vw"
            />
          </div>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur-sm sm:bottom-4">
            {selectedImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
