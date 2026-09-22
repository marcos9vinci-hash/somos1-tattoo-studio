import React from 'react';
import TattooEngineCore from './App';

export default function TattooEngineModule() {
  return (
    <div className="tattoo-engine-scope w-full h-[85vh] min-h-[720px] bg-[#0a0a0a] text-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col">
      <TattooEngineCore />
    </div>
  );
}
