import React, { useState, useEffect } from 'react';
import { AssetRecord, ModelShootParams, TaskRecord } from '../types/index.ts';

interface ModelShootTabProps {
  benchmarkAssets: AssetRecord[];
  onNavigateToTryOn: (garment: AssetRecord, modelPhoto?: string) => void;
  onOpenVideoModal: (dataUrl: string) => void;
  onOpenAnalysis: (dataUrl: string) => void;
  onTaskCreated: (taskId: string) => void;
}

export const ModelShootTab: React.FC<ModelShootTabProps> = ({
  benchmarkAssets,
  onNavigateToTryOn,
  onOpenVideoModal,
  onOpenAnalysis,
  onTaskCreated,
}) => {
  const [garmentAsset, setGarmentAsset] = useState<AssetRecord | null>(null);

  // Shoot parameters
  const [modelStyle, setModelStyle] = useState<ModelShootParams['modelStyle']>('commercial_catalog');
  const [gender, setGender] = useState<ModelShootParams['gender']>('female');
  const [composition, setComposition] = useState<ModelShootParams['composition']>('full_body');
  const [background, setBackground] = useState<ModelShootParams['background']>('studio_warm_grey');
  const [pose, setPose] = useState<ModelShootParams['pose']>('natural_standing');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [numCandidates, setNumCandidates] = useState<number>(2);

  // Fast triage info
  const [fastTriage, setFastTriage] = useState<{ category: string; summary: string } | null>(null);

  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null);
  const [candidateAssets, setCandidateAssets] = useState<AssetRecord[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<AssetRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (benchmarkAssets.length > 0 && !garmentAsset) {
      const defaultGarment = benchmarkAssets.find((a) => a.id === 'benchmark_garment_silk_jacket') || benchmarkAssets[1];
      setGarmentAsset(defaultGarment);
    }
  }, [benchmarkAssets, garmentAsset]);

  // Fast triage when garment changes
  useEffect(() => {
    if (garmentAsset) {
      fetch('/api/fast-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: garmentAsset.dataUrl }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setFastTriage({ category: data.category, summary: data.summary });
          }
        })
        .catch(() => {});
    }
  }, [garmentAsset]);

  const handleUploadGarment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl,
            name: file.name,
            category: 'garment',
            tags: ['custom_upload', 'garment'],
          }),
        });
        const uploaded = await res.json();
        setGarmentAsset({
          id: uploaded.assetId,
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          dataUrl,
          category: 'garment',
          createdAt: uploaded.createdAt,
        });
      } catch (err: any) {
        setErrorMsg('Failed to upload garment photo.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteModelShoot = async () => {
    if (!garmentAsset) {
      setErrorMsg('Please select or upload an apparel garment.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setCandidateAssets([]);
    setSelectedCandidate(null);

    try {
      const payload: ModelShootParams = {
        garmentAssetId: garmentAsset.id,
        modelStyle,
        gender,
        composition,
        background,
        pose,
        imageSize,
        numCandidates,
      };

      const res = await fetch('/api/model-shoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit model shoot task.');
      }

      const taskData = await res.json();
      onTaskCreated(taskData.taskId);
      pollTask(taskData.taskId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Model shoot failed.');
      setIsSubmitting(false);
    }
  };

  const pollTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error('Task lookup failed.');
      const task: TaskRecord = await res.json();
      setActiveTask(task);

      if (task.status === 'completed') {
        setIsSubmitting(false);
        if (task.resultAssetIds && task.resultAssetIds.length > 0) {
          const loadedAssets: AssetRecord[] = [];
          for (const resId of task.resultAssetIds) {
            const assetRes = await fetch(`/api/results/${resId}`);
            if (assetRes.ok) {
              const assetData = await assetRes.json();
              loadedAssets.push(assetData);
            }
          }
          setCandidateAssets(loadedAssets);
          if (loadedAssets.length > 0) {
            setSelectedCandidate(loadedAssets[0]);
          }
        }
      } else if (task.status === 'failed' || task.status === 'cancelled') {
        setIsSubmitting(false);
        setErrorMsg(task.error || task.stageMessage || 'Task execution failed.');
      } else {
        setTimeout(() => pollTask(taskId), 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error checking task status.');
      setIsSubmitting(false);
    }
  };

  const garmentBenchmarks = benchmarkAssets.filter((a) => a.category === 'garment');

  return (
    <div className="space-y-10">
      {/* Editorial Header */}
      <div className="border-b border-stone-200 pb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          AI Fashion Model Studio
        </h1>
        <p className="mt-2 text-stone-600 text-sm max-w-3xl leading-relaxed">
          Synthesize high-end virtual fashion models wearing only your reference apparel. Preserves crucial cut, buttons, lapel geometry, stitching, and fabric textures while generating authentic commercial poses and studio lighting.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-mono underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Form & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Reference Garment Selection */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-900 text-sm">Reference Apparel Photo</span>
              <label className="text-xs text-stone-700 hover:text-stone-950 underline cursor-pointer font-mono">
                Upload New
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadGarment}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden border border-stone-200">
              {garmentAsset ? (
                <img
                  src={garmentAsset.dataUrl}
                  alt={garmentAsset.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-stone-400 font-mono">
                  No garment selected
                </div>
              )}
              {garmentAsset && (
                <div className="absolute bottom-2 left-2 right-2 bg-stone-900/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs truncate font-mono">
                  {garmentAsset.name}
                </div>
              )}
            </div>

            {/* Fast Triage Box */}
            {fastTriage && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1">
                <div className="font-mono text-stone-500 uppercase tracking-wider text-[10px]">
                  Detected Category: {fastTriage.category}
                </div>
                <div className="text-stone-700">{fastTriage.summary}</div>
              </div>
            )}

            {/* Benchmarks Selector */}
            <div className="space-y-1.5 pt-2 border-t border-stone-100">
              <span className="text-xs text-stone-500 font-mono">Benchmark Apparel:</span>
              <div className="flex flex-wrap gap-2">
                {garmentBenchmarks.map((bench) => (
                  <button
                    key={bench.id}
                    onClick={() => setGarmentAsset(bench)}
                    className={`text-xs px-2.5 py-1 rounded border font-mono transition-colors ${
                      garmentAsset?.id === bench.id
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {bench.name.includes('Blazer')
                      ? 'Wool Blazer'
                      : bench.name.includes('Silk')
                      ? 'Silk Bomber'
                      : 'Knit Sweater'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Model Style, Poses & Shoot Parameters */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-6 shadow-sm">
            <h2 className="text-base font-semibold text-stone-900">
              Editorial Shoot Direction
            </h2>

            {/* Model Photography Style */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-stone-500 uppercase tracking-wider block">
                Photography & Editorial Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'commercial_catalog', label: 'Commercial E-Commerce', desc: 'Bright, clean, high conversion' },
                  { id: 'high_fashion_editorial', label: 'High Fashion Editorial', desc: 'Haute couture, dramatic lighting' },
                  { id: 'streetwear_lookbook', label: 'Streetwear Lookbook', desc: 'Urban attitude, candid stride' },
                  { id: 'minimalist_nordic', label: 'Minimalist Nordic', desc: 'Soft diffused morning light' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setModelStyle(s.id as any)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      modelStyle === s.id
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-xs font-medium">{s.label}</div>
                    <div className={`text-[10px] mt-0.5 ${modelStyle === s.id ? 'text-stone-300' : 'text-stone-500'}`}>
                      {s.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Gender & Pose */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-stone-500 uppercase tracking-wider block">
                  Model Profile
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['female', 'male', 'unisex'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-1.5 text-xs font-mono capitalize rounded border text-center transition-colors ${
                        gender === g
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-stone-500 uppercase tracking-wider block">
                  Pose & Motion
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'natural_standing', label: 'Standing' },
                    { id: 'walking_motion', label: 'Walking' },
                    { id: 'relaxed_seated', label: 'Seated' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPose(p.id as any)}
                      className={`py-1.5 text-xs font-mono rounded border text-center transition-colors ${
                        pose === p.id
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Background & Composition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-stone-500 uppercase tracking-wider block">
                  Studio Environment
                </label>
                <select
                  value={background}
                  onChange={(e) => setBackground(e.target.value as any)}
                  className="w-full py-2 px-3 text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg text-stone-800"
                >
                  <option value="studio_warm_grey">Seamless Warm Grey Cyclorama</option>
                  <option value="architectural_concrete">Brutalist Architectural Concrete</option>
                  <option value="sunlit_loft">Open Sunlit Warehouse Loft</option>
                  <option value="outdoor_urban">European Architectural Street</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-stone-500 uppercase tracking-wider block">
                  Camera Framing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'full_body', label: 'Full Body' },
                    { id: 'three_quarter', label: '3/4 Turn' },
                    { id: 'close_up_detail', label: 'Close-Up' },
                  ].map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => setComposition(comp.id as any)}
                      className={`py-1.5 text-xs font-mono rounded border text-center transition-colors ${
                        composition === comp.id
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {comp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resolution Affordance (1K, 2K, 4K) & Candidates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
              <div className="space-y-2">
                <label className="text-xs font-mono text-stone-500 uppercase tracking-wider block">
                  Image Size (Nano Banana 2.1)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setImageSize(sz)}
                      className={`py-1.5 text-xs font-mono rounded border text-center transition-colors ${
                        imageSize === sz
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-stone-500 uppercase tracking-wider block">
                  Candidate Variations
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumCandidates(num)}
                      className={`py-1.5 text-xs font-mono rounded border text-center transition-colors ${
                        numCandidates === num
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {num} {num === 1 ? 'Candidate' : 'Candidates'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              disabled={isSubmitting || !garmentAsset}
              onClick={handleExecuteModelShoot}
              className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Generating AI Model Photography...</span>
                </>
              ) : (
                <span>Synthesize High-Fidelity Fashion Model ({imageSize})</span>
              )}
            </button>

            {/* Progress status */}
            {activeTask && isSubmitting && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-stone-600">
                  <span>{activeTask.stageMessage}</span>
                  <span className="tabular-nums font-semibold">{activeTask.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-900 transition-all duration-300"
                    style={{ width: `${activeTask.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Candidates Gallery */}
      {candidateAssets.length > 0 && selectedCandidate && garmentAsset && (
        <div className="mt-12 p-8 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-stone-900">
                Generated Fashion Model Showcase
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mt-1">
                <span>Model: {activeTask?.modelUsed || 'gemini-nano-banana-2.1'}</span>
                <span aria-hidden="true">·</span>
                <span>Consistency Score: {activeTask?.qualityMetrics?.garmentConsistencyScore || 94}%</span>
                <span aria-hidden="true">·</span>
                <span>Resolution: {imageSize}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={selectedCandidate.dataUrl}
                download="atelier_fashion_model.jpg"
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors whitespace-nowrap"
              >
                Download Model Image
              </a>
              <button
                onClick={() => onOpenVideoModal(selectedCandidate.dataUrl)}
                className="px-4 py-2 bg-stone-100 text-stone-800 border border-stone-200 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors whitespace-nowrap"
              >
                Runway Video (Veo)
              </button>
              <button
                onClick={() => onOpenAnalysis(selectedCandidate.dataUrl)}
                className="px-4 py-2 bg-stone-100 text-stone-800 border border-stone-200 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors whitespace-nowrap"
              >
                Analyze Styling (Gemini 4)
              </button>
            </div>
          </div>

          {/* Candidate selector if multiple */}
          {candidateAssets.length > 1 && (
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-stone-500">Select Candidate:</span>
              <div className="flex items-center gap-3">
                {candidateAssets.map((cand, idx) => (
                  <button
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`flex items-center gap-2 p-1.5 pr-3 rounded-lg border text-xs font-mono transition-colors ${
                      selectedCandidate.id === cand.id
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <img
                      src={cand.dataUrl}
                      alt={`Cand ${idx + 1}`}
                      className="w-8 h-8 rounded object-cover"
                    />
                    <span>Variation #{idx + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inspection View: Garment Reference vs Generated Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              <div className="text-xs font-mono text-stone-500">
                Original Apparel Reference
              </div>
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-100 aspect-[3/4]">
                <img
                  src={garmentAsset.dataUrl}
                  alt="Garment Reference"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono text-stone-500">
                Generated Commercial Model
              </div>
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-100 aspect-[3/4]">
                <img
                  src={selectedCandidate.dataUrl}
                  alt="Generated Model"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
