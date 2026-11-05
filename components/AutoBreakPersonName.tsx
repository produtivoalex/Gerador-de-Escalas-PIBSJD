import React, { useRef, useState, useLayoutEffect } from 'react';

export function splitCompoundName(name: string): { firstPart: string; secondPart: string } | null {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return null;

  if (words.length === 2) {
    return { firstPart: words[0], secondPart: words[1] };
  }

  // Preposições comuns em português para manter agrupadas com a segunda parte
  const preps = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  if (words.length === 3 && preps.has(words[1].toLowerCase())) {
    return { firstPart: words[0], secondPart: `${words[1]} ${words[2]}` };
  }

  const splitIndex = Math.ceil(words.length / 2);
  return {
    firstPart: words.slice(0, splitIndex).join(' '),
    secondPart: words.slice(splitIndex).join(' ')
  };
}

interface AutoBreakPersonNameProps {
  label: string;
  name: string;
}

export const AutoBreakPersonName: React.FC<AutoBreakPersonNameProps> = ({ label, name }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  const compound = splitCompoundName(name);

  // Heurística inicial para renderização estável antes da medição de layout
  const [isCutOff, setIsCutOff] = useState(() => {
    return Boolean(compound && (label.length + name.length > 15));
  });

  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || !measureRef.current) return;
      const availableWidth = containerRef.current.clientWidth;
      const singleLineWidth = measureRef.current.scrollWidth;

      if (availableWidth === 0) return;

      // Identifica automaticamente se a versão em linha única ultrapassa o espaço disponível (cortada)
      const cutOff = singleLineWidth > (availableWidth - 1);
      setIsCutOff(cutOff);
    };

    checkOverflow();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        checkOverflow();
      });
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', checkOverflow);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [label, name]);

  return (
    <div ref={containerRef} className="relative w-full min-w-0" data-cutoff={isCutOff ? 'true' : 'false'}>
      {/* Sonda invisível de medição para identificar automaticamente se o nome em linha única seria cortado */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="absolute left-0 top-0 opacity-0 pointer-events-none select-none whitespace-nowrap"
        style={{ visibility: 'hidden', position: 'absolute' }}
      >
        <span className="font-bold mr-1 shrink-0">{label}</span>
        <span className="font-bold uppercase">{name}</span>
      </span>

      {/* Renderização com quebra de linha ativada imediatamente ao identificar corte */}
      {isCutOff ? (
        <div className="leading-tight text-left break-words overflow-hidden [overflow-wrap:anywhere]">
          {compound ? (
            <>
              <div className="flex items-baseline flex-wrap">
                <span className="font-bold text-gray-700 mr-1 shrink-0">{label}</span>
                <span className="font-bold uppercase">{compound.firstPart}</span>
              </div>
              <div className="font-bold uppercase leading-tight pl-0.5">
                {compound.secondPart}
              </div>
            </>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-gray-700 shrink-0 leading-tight">{label}</span>
              <span className="font-bold uppercase leading-tight [overflow-wrap:anywhere] break-words">{name}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center leading-snug whitespace-nowrap overflow-hidden">
          <span className="font-bold text-gray-700 mr-1 shrink-0">{label}</span>
          <span className="font-bold uppercase">{name}</span>
        </div>
      )}
    </div>
  );
};

export default AutoBreakPersonName;

