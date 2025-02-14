"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
    document.body.style.overflow = "auto";
  };

  const goToPrevious = () => {
    setSelectedImageIndex((prev) => {
      if (prev === null) return null;
      return prev === 0 ? images.length - 1 : prev - 1;
    });
  };

  const goToNext = () => {
    setSelectedImageIndex((prev) => {
      if (prev === null) return null;
      return prev === images.length - 1 ? 0 : prev + 1;
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (selectedImageIndex === null) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
  };

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex]); // Add selectedImageIndex as dependency

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className="group relative aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={image}
              alt={`Property image ${index + 1}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </button>
        ))}
      </div>

      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>

          <button
            onClick={goToPrevious}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="relative h-[80vh] w-[90vw]">
            <Image
              src={images[selectedImageIndex]}
              alt={`Property image ${selectedImageIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
            {selectedImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
