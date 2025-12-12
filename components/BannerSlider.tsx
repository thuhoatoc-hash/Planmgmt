
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop", // Office
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop", // Building
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2664&auto=format&fit=crop"  // Meeting
];

const BannerSlider: React.FC = () => {
  const [images, setImages] = useState<string[]>(DEFAULT_IMAGES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [intervalTime, setIntervalTime] = useState(3000);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Load images and settings from Supabase
  useEffect(() => {
    const loadConfig = async () => {
        try {
            const config = await api.settings.getBannerConfig();
            if (config) {
                if (config.images && config.images.length > 0) {
                    setImages(config.images);
                } else {
                    setImages(DEFAULT_IMAGES);
                }
                
                if (config.interval) setIntervalTime(config.interval);
                
                // Set enabled state (default true if undefined)
                setEnabled(config.enabled ?? true);
            } else {
                setImages(DEFAULT_IMAGES);
                setEnabled(true);
            }
        } catch (e) {
            console.error('Failed to load banner config', e);
            setImages(DEFAULT_IMAGES);
        } finally {
            setLoading(false);
        }
    };

    loadConfig();
    
    // Simple polling to keep clients updated occasionally (e.g. every minute)
    const pollInterval = setInterval(loadConfig, 60000);

    return () => clearInterval(pollInterval);
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  // Auto slide - Reset timer whenever currentIndex changes (user manual interaction included)
  useEffect(() => {
    if (images.length <= 1 || !enabled) return;

    const interval = setInterval(() => {
      nextSlide();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [images.length, intervalTime, enabled, currentIndex]);

  // Touch Event Handlers for Swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // Reset touch end
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50; // px

    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    }
    if (isRightSwipe) {
      prevSlide();
    }
  };

  // Don't render anything if disabled
  if (!enabled) return null;

  // Force render container even if loading to prevent layout jump
  return (
    <div className="relative w-full bg-slate-200 overflow-hidden shadow-sm mb-6 rounded-xl group select-none min-h-[200px] md:min-h-[400px]">
      {/* Main Image Container */}
      <div 
        className="relative w-full h-[200px] md:h-[400px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        )}
        
        {images.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img 
              src={img} 
              alt={`Banner ${index + 1}`} 
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                  // Fallback if image load fails
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600";
              }}
            />
            {/* Subtle Gradient Overlay for Text Visibility if needed later */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        ))}

        {/* Navigation Arrows - Only show on hover on Desktop */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/30 hover:bg-white/50 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/30 hover:bg-white/50 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Dots Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'bg-white w-8' : 'bg-white/50 w-2 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BannerSlider;
