import React from 'react';
import { TabType } from '../types/index.ts';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenIntelligence: () => void;
  onOpenVideoModal: () => void;
  activeTasksCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenIntelligence,
  onOpenVideoModal,
  activeTasksCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element in luxury display typography) */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('try_on');
            }}
            className="font-serif text-2xl font-bold tracking-tight text-stone-900 hover:text-stone-700 transition-colors whitespace-nowrap shrink-0"
          >
            ATELIER AI
          </a>
          <span className="hidden lg:inline text-xs font-mono text-stone-400 tracking-wider uppercase">
            Commercial Studio
          </span>
        </div>

        {/* Zone 2: 4-5 single-line clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <button
            onClick={() => setActiveTab('designer')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 ${
              activeTab === 'designer'
                ? 'text-stone-950 border-stone-900 font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            AI Designer
          </button>

          <button
            onClick={() => setActiveTab('try_on')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 ${
              activeTab === 'try_on'
                ? 'text-stone-950 border-stone-900 font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Virtual Try-On
          </button>

          <button
            onClick={() => setActiveTab('model_shoot')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 ${
              activeTab === 'model_shoot'
                ? 'text-stone-950 border-stone-900 font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            AI Model Studio
          </button>

          <button
            onClick={() => setActiveTab('recolor')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 ${
              activeTab === 'recolor'
                ? 'text-stone-950 border-stone-900 font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Precision Recolor
          </button>

          <button
            onClick={() => setActiveTab('engine_hub')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 ${
              activeTab === 'engine_hub'
                ? 'text-stone-950 border-stone-900 font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Engine &amp; Audits
          </button>

          <button
            onClick={onOpenIntelligence}
            className="whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 border-transparent hover:text-stone-900 hover:border-stone-300 flex items-center gap-1.5"
          >
            Fabric Intelligence
          </button>

          <button
            onClick={onOpenVideoModal}
            className="whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 border-transparent hover:text-stone-900 hover:border-stone-300 flex items-center gap-1.5"
          >
            Runway Video (Veo)
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-mono rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <span>Pipeline Tasks</span>
            {activeTasksCount > 0 && (
              <span className="font-semibold text-amber-500 tabular-nums">
                ({activeTasksCount})
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
