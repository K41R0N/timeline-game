'use client';

interface SplashScreenProps {
  onStart: () => void;
}

export function SplashScreen({ onStart }: SplashScreenProps) {
  return (
    <div className="w-full h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center overflow-hidden animate-fadeIn">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-bright/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto px-6 text-center">
        {/* Title */}
        <h1 className="text-7xl md:text-8xl font-bold text-primary mb-6 tracking-tight">
          History Links
        </h1>

        {/* Tagline */}
        <p className="text-2xl md:text-3xl text-foreground-muted mb-12">
          Connect historical figures through time
        </p>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="px-12 py-4 rounded-lg text-xl font-bold bg-primary hover:bg-primary-bright text-white hover:scale-105 shadow-lg hover:shadow-glow transition-all duration-300 transform"
        >
          ▶ Start Playing
        </button>
      </div>
    </div>
  );
}
