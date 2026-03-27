import { useRef, useEffect, useCallback } from 'react';

interface ScrollPickerProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

const ITEM_HEIGHT = 52;
const VISIBLE = 5;

export function ScrollPicker({ items, value, onChange }: ScrollPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isUserScrolling = useRef(false);

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: smooth ? 'smooth' : 'instant',
      });
    },
    []
  );

  useEffect(() => {
    const index = items.indexOf(value);
    if (index >= 0) {
      setTimeout(() => scrollToIndex(index, false), 50);
    }
  }, []);

  useEffect(() => {
    if (!isUserScrolling.current) {
      const index = items.indexOf(value);
      if (index >= 0) {
        scrollToIndex(index, false);
      } else if (items.length > 0) {
        scrollToIndex(items.length - 1, false);
        onChange(items[items.length - 1]);
      }
    }
  }, [value, items]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const index = Math.round(container.scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      scrollToIndex(clampedIndex, true);
      if (items[clampedIndex] !== value) {
        onChange(items[clampedIndex]);
      }
      setTimeout(() => {
        isUserScrolling.current = false;
      }, 200);
    }, 80);
  }, [items, value, onChange, scrollToIndex]);

  const totalHeight = ITEM_HEIGHT * VISIBLE;
  const padding = ITEM_HEIGHT * 2;

  return (
    <div className="relative" style={{ height: totalHeight }}>
      <div
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{
          top: ITEM_HEIGHT * 2,
          height: ITEM_HEIGHT,
          borderTop: '1px solid rgba(63,253,212,0.25)',
          borderBottom: '1px solid rgba(63,253,212,0.25)',
          backgroundColor: 'rgba(63,253,212,0.05)',
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: ITEM_HEIGHT * 2,
          background: 'linear-gradient(to bottom, #2C2C30 20%, transparent 100%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: ITEM_HEIGHT * 2,
          background: 'linear-gradient(to top, #2C2C30 20%, transparent 100%)',
        }}
      />

      <div
        ref={containerRef}
        style={{
          height: totalHeight,
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        <div style={{ height: padding }} />

        {items.map((item) => {
          const isSelected = item === value;
          const selectedIdx = items.indexOf(value);
          const itemIdx = items.indexOf(item);
          const distance = Math.abs(itemIdx - selectedIdx);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.45 : 0.2;

          return (
            <div
              key={item}
              onClick={() => {
                const index = items.indexOf(item);
                scrollToIndex(index, true);
                onChange(item);
              }}
              style={{
                height: ITEM_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isSelected ? '#FFFFFF' : '#888888',
                fontSize: isSelected ? '20px' : distance === 1 ? '17px' : '15px',
                fontWeight: isSelected ? '700' : '400',
                opacity,
                transition: 'color 0.15s, font-size 0.15s, opacity 0.15s',
              }}
            >
              {item}
            </div>
          );
        })}

        <div style={{ height: padding }} />
      </div>
    </div>
  );
}
