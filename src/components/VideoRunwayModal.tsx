import React, { useState } from 'react';

interface VideoRunwayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageDataUrl?: string;
}

export const VideoRunwayModal: React.FC<VideoRunwayModalProps> = ({
  isOpen,
  onClose,
  initialImageDataUrl,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(initialImageDataUrl || null);
  const [prompt, setPrompt] = useState<string>(
    'Fashion model walking down a sunlit minimalist concrete runway, natural fabric movement and fluid folds, 4k cinematic lighting'
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stageText, setStageText] = useState<string>('');

  if (!isOpen) return null;

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setVideoUri(null);
    setStageText('Initiating Veo 3.1 fast video synthesis operation...');

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: selectedImage || undefined,
          prompt,
          aspectRatio,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start video generation.');
      }

      const { operationName } = await res.json();
      pollVideoStatus(operationName);
    } catch (err: any) {
      setErrorMsg(err.message || 'Video generation failed.');
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (operationName: string) => {
    setStageText('Rendering fluid fabric motion and lighting passes with Veo 3...');
    try {
      const res = await fetch('/api/video-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (!res.ok) throw new Error('Status poll failed.');
      const data = await res.json();

      if (data.done) {
        setIsGenerating(false);
        setVideoUri(data.videoUri || null);
      } else {
        setTimeout(() => pollVideoStatus(operationName), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Polling failed.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-stone-900">
              Runway Video Studio (Veo)
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mt-0.5">
              <span>Model: veo-3.1-fast-generate-preview</span>
              <span aria-hidden="true">·</span>
              <span>Aspect Ratio: {aspectRatio}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-lg font-mono p-1"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Video Canvas or Placeholder */}
        <div className="relative aspect-[9/16] max-h-[420px] bg-stone-900 rounded-xl overflow-hidden flex items-center justify-center mx-auto border border-stone-200">
          {videoUri ? (
            <video
              src={videoUri}
              controls
              autoPlay
              loop
              className="w-full h-full object-cover"
            />
          ) : selectedImage ? (
            <img
              src={selectedImage}
              alt="Start frame"
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="text-stone-400 text-xs font-mono text-center p-6">
              Select or generate a fashion photo to animate
            </div>
          )}

          {isGenerating && (
            <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
              <span className="animate-spin text-2xl">⏳</span>
              <div className="text-xs font-mono text-stone-300">{stageText}</div>
              <div className="text-[10px] text-stone-400 max-w-xs">
                Veo video synthesis calculates fluid cloth physics, realistic stride motions, and natural camera motion.
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-mono text-stone-500 uppercase block">
              Cinematic Runway Prompt
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full py-2 px-3 text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg text-stone-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-stone-500 uppercase block">
              Aspect Ratio (Veo Standard)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['9:16', '16:9'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 text-xs font-mono rounded border transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {ratio === '9:16' ? '9:16 Vertical Runway Story' : '16:9 Landscape Wide Cinema'}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={isGenerating}
            onClick={handleStartGeneration}
            className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
          >
            {isGenerating ? 'Rendering Video...' : 'Synthesize Runway Fashion Video (Veo)'}
          </button>
        </div>
      </div>
    </div>
  );
};
