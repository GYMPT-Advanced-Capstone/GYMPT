import { ChevronLeft } from 'lucide-react';

interface GoalLayoutProps {
  step: number;
  totalSteps?: number;
  onBack: () => void;
  children: React.ReactNode;
}

export function GoalLayout({
  step,
  totalSteps = 6,
  onBack,
  children,
}: GoalLayoutProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <div
      className="flex justify-center items-start"
      style={{ minHeight: '100dvh', backgroundColor: '#121212' }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '100dvh',
          backgroundColor: '#121212',
        }}
      >
        <div className="px-4 pt-12 pb-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'transparent',
              color: '#F1F5F9',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
        </div>

        <div className="px-6 pt-2 pb-0">
          <div className="flex items-center justify-between mb-2">
            <span
              style={{
                color: '#72e1b1',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '1.2px',
              }}
            >
              STEP {step}
            </span>
            <span
              style={{
                color: '#72e1b1',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {step}/{totalSteps}
            </span>
          </div>
          <div
            className="rounded-full overflow-hidden"
            style={{ height: 6, backgroundColor: 'rgba(45,212,191,0.2)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: '#72e1b1',
              }}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );
}
