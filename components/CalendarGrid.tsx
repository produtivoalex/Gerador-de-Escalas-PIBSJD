
import React from 'react';
import { ChurchEvent, ServiceType, UIConfig } from '../types';

interface CalendarGridProps {
  currentDate: Date;
  events: ChurchEvent[];
  config: UIConfig;
  onDateClick: (dateStr: string) => void;
  onEventClick: (event: ChurchEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  currentDate, 
  events, 
  config,
  onDateClick, 
  onEventClick,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  for (let i = 0; i < startingDay; i++) currentWeek.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    currentWeek.push(i);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const getEventsForDay = (day: number) => {
    const paddedMonth = String(month + 1).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    const standardDate = `${year}-${paddedMonth}-${paddedDay}`;
    return events.filter(e => e.date === standardDate);
  };

  const getEventColors = (event: ChurchEvent) => {
    switch (event.type) {
      case ServiceType.ADORACAO: 
        return { 
          backgroundColor: config.bgColorAdoracao, 
          titleColor: config.colorAdoracaoTitle,
          textColor: config.colorAdoracaoText
        };
      case ServiceType.CENTRAL: 
        return { 
          backgroundColor: config.bgColorCentral, 
          titleColor: config.colorCentralTitle,
          textColor: config.colorCentralText 
        };
      case ServiceType.DOMICILIAR: 
        return { 
          backgroundColor: config.bgColorDomiciliar, 
          titleColor: config.colorDomiciliarTitle,
          textColor: config.colorDomiciliarText
        };
      default: 
        return { 
          backgroundColor: config.bgColorOutro, 
          titleColor: config.colorOutroTitle,
          textColor: config.colorOutroText 
        };
    }
  };

  return (
    <div 
      className="flex flex-col h-full w-full border"
      style={{ borderColor: config.gridBorderColor, borderLeft: `1px solid ${config.gridBorderColor}`, borderTop: `1px solid ${config.gridBorderColor}` }}
    >
      <div 
        className="grid grid-cols-7 font-bold text-center uppercase shrink-0" 
        style={{ 
          backgroundColor: config.headerBgColor, 
          color: config.headerTextColor,
          fontSize: `${config.fontSizeWeekDays}px` 
        }}
      >
        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(d => (
          <div key={d} className="border-r border-white/80 last:border-0 py-1.5">{d}</div>
        ))}
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="flex-1 grid grid-cols-7 min-h-0 border-b last:border-b-0" style={{ borderColor: config.gridBorderColor }}>
            {week.map((day, dIndex) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isSunday = dIndex === 0;
              return (
                <div 
                  key={dIndex} 
                  className={`relative p-1.5 border-r last:border-r-0 flex flex-col h-full overflow-hidden ${day ? 'hover:bg-gray-50/20 cursor-pointer' : 'bg-gray-50/5'}`} 
                  style={{ borderColor: config.gridBorderColor }} 
                  onClick={() => day && onDateClick(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                >
                  {day && (
                    <>
                      <span className={`font-bold mb-1 block leading-none ${isSunday ? 'text-[#DC2626]' : 'text-gray-900'}`} style={{ fontSize: `${config.fontSizeDayNumber}px` }}>{String(day).padStart(2, '0')}</span>
                      <div className="flex flex-col gap-1 flex-1 w-full justify-center">
                        {dayEvents.map(event => {
                          const colors = getEventColors(event);
                          const isPGM = event.type === ServiceType.DOMICILIAR;
                          return (
                            <div 
                              key={event.id} 
                              onClick={(e) => { e.stopPropagation(); onEventClick(event); }} 
                              className="relative flex flex-col group border w-full transition-all" 
                              style={{ 
                                backgroundColor: colors.backgroundColor, 
                                borderColor: `${colors.titleColor}20`, 
                                padding: `${config.cardPadding}px`, 
                                borderRadius: `${config.cardBorderRadius}px` 
                              }}
                            >
                              <div className="font-bold uppercase leading-snug mb-0.5" style={{ fontSize: `${config.fontSizeCardTitle}px`, color: colors.titleColor }}>
                                {isPGM ? "CULTO DOMICILIAR / PEQUENOS GRUPOS" : (event.type === ServiceType.OUTRO ? (event.customTitle || "OUTRO") : event.type)}
                              </div>
                              <div className="leading-snug flex flex-col gap-0.5" style={{ fontSize: `${config.fontSizeCardText}px`, color: colors.textColor }}>
                                {event.leader && (
                                  <div className="truncate flex items-center">
                                    <span className="font-bold text-gray-700 mr-1 shrink-0">DIR:</span>
                                    <span className="font-bold uppercase">{event.leader}</span>
                                  </div>
                                )}
                                {event.preacher && (
                                  <div className="truncate flex items-center">
                                    <span className="font-bold text-gray-700 mr-1 shrink-0">PREG:</span>
                                    <span className="font-bold uppercase">{event.preacher}</span>
                                  </div>
                                )}
                                {event.notes && event.notes !== 'PGMs' && (
                                  <div className="mt-1 px-1 py-0.5 bg-[#781818] text-white font-bold text-[7px] uppercase tracking-wider rounded-sm text-center">
                                    {event.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
