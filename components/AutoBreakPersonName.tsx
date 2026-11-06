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
  const labelRef = useRef<HTMLSpanElement>(null);
  const probeNameRef = useRef<HTMLSpanElement>(null);

  const compound = splitCompoundName(name);

  // Heurística inicial ágil: se o nome tem mais de 10 caracteres ou é composto, ativa por padrão para nunca cortar
  const [isCutOff, setIsCutOff] = useState(() => {
    return Boolean(compound || name.length > 10);
  });

  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || !probeNameRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      if (containerWidth === 0) return;

      const labelWidth = labelRef.current ? labelRef.current.offsetWidth : 28;
      // Espaço disponível exclusivamente para o nome ao lado do rótulo
      const availableForName = containerWidth - labelWidth - 4; // 4px de margem do mr-1
      
      // Largura que o nome completo precisaria em linha única sem quebra
      const requiredNameWidth = probeNameRef.current.scrollWidth;

      // Se o nome não couber confortavelmente ao lado do DIR/PREG, ativa imediatamente a quebra
      const cutOff = requiredNameWidth > availableForName;
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
      {/* Sonda invisível precisa para medir a largura real necessária pelo NOME em linha única */}
      <span
        ref={probeNameRef}
        aria-hidden="true"
        data-probe="true"
        className="absolute left-0 top-0 opacity-0 pointer-events-none select-none whitespace-nowrap font-bold uppercase"
        style={{ visibility: 'hidden', position: 'absolute' }}
      >
        {name}
      </span>

      {/* Renderização com alinhamento: a quebra de linha fica exatamente ABAIXO DO NOME */}
      <div className="flex items-start leading-tight">
        <span ref={labelRef} className="font-bold text-gray-700 mr-1 shrink-0 select-none">
          {label}
        </span>

        {isCutOff ? (
          <div className="flex-1 min-w-0 flex flex-col font-bold uppercase leading-tight overflow-hidden [overflow-wrap:anywhere] break-words">
            {compound ? (
              <>
                <span>{compound.firstPart}</span>
                <span className="leading-tight">{compound.secondPart}</span>
              </>
            ) : (
              <span className="[overflow-wrap:anywhere] break-words">{name}</span>
            )}
          </div>
        ) : (
          <span className="font-bold uppercase whitespace-nowrap overflow-hidden">
            {name}
          </span>
        )}
      </div>
    </div>
  );
};

export default AutoBreakPersonName;


