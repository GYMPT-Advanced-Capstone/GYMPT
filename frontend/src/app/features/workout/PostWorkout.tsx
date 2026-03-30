import { useNavigate, useLocation } from "react-router";
import { ArrowLeft, Activity } from "lucide-react";
import { BottomNav } from "../../components/BottomNav"; 

export function PostWorkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const exerciseName = location.state?.name || "스쿼트";

  return (
    <div
      className="flex justify-center items-start w-full"
      style={{ minHeight: '100dvh', backgroundColor: '#111111' }} 
    >
      <div
        className="flex flex-col relative overflow-y-auto p-5" 
        style={{
          width: '100%',
          maxWidth: '390px',
          minHeight: '100dvh',
          backgroundColor: '#1A1A1A',
          color: 'white',
          paddingBottom: 88 
        }}
      >
        <header className="flex items-center justify-center relative mb-8 pt-2 shrink-0">
          <button 
            onClick={() => navigate(-1)} 
            className="absolute left-0 p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[17px] font-bold tracking-widest text-white">운동 결과</h1>
        </header>

        <div className="bg-gradient-to-br from-[#12221D] to-[#0A1411] border border-[#3FFDD4]/20 rounded-[24px] p-5 mb-8 flex items-center gap-5 shadow-[0_4px_24px_rgba(63,253,212,0.05)] shrink-0">
          <div className="w-[84px] h-[84px] bg-[#1A1E24] rounded-2xl flex items-center justify-center border border-[#3FFDD4]/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#3FFDD4]/5"></div>
            <Activity size={36} className="text-[#3FFDD4] relative z-10 drop-shadow-[0_0_8px_rgba(63,253,212,0.5)]" strokeWidth={1.5} />
          </div>
          
          <div className="flex flex-col flex-1">
            <h2 className="text-[22px] font-bold text-white mb-3 tracking-tight">{exerciseName}</h2>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[12px] text-gray-400 font-medium mb-1">목표</span>
                <span className="text-[16px] font-bold text-[#3FFDD4]">20</span>
              </div>
              <div className="w-px h-8 bg-gray-800"></div>
              <div className="flex flex-col">
                <span className="text-[12px] text-gray-400 font-medium mb-1">성공</span>
                <span className="text-[16px] font-bold text-[#FF5A5A]">18</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col mb-4">
          <h3 className="text-[17px] font-bold text-white tracking-tight mb-4 px-1">운동 내용</h3>
          
          <div className="bg-[#1C2025] rounded-[24px] p-6 border border-white/5 shadow-lg flex flex-col gap-5">
            <DetailRow label="운동시간" value="12:30" color="text-[#FFD700]" />
            <div className="h-px w-full bg-gray-800/80"></div>
            
            <DetailRow label="칼로리 소모" value="150 KCAL" color="text-[#FF5A5A]" />
            <div className="h-px w-full bg-gray-800/80"></div>
            
            <DetailRow label="운동점수" value="87 점" color="text-[#4DA6FF]" />
            <div className="h-px w-full bg-gray-800/80"></div>
            
            <DetailRow label="세트시간" value="03:00" color="text-[#3FFDD4]" />
          </div>
        </div>

        <div className="flex gap-3 mt-auto pt-4 shrink-0">
          <button 
            onClick={() => navigate('/camera')}
            className="flex-1 bg-[#3FFDD4] text-[#111111] text-[16px] font-bold py-4 rounded-2xl shadow-[0_4px_20px_rgba(63,253,212,0.2)] hover:brightness-110 transition-all active:scale-[0.98]"
          >
            운동 재개
          </button>
          <button 
            onClick={() => navigate('/main')}
            className="flex-1 bg-[#FF3366] text-white text-[16px] font-bold py-4 rounded-2xl shadow-[0_4px_20px_rgba(255,51,102,0.2)] hover:brightness-110 transition-all active:scale-[0.98]"
          >
            운동 완료
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] text-gray-400 font-medium">{label}</span>
      <span className={`text-[22px] font-bold tracking-tight ${color}`}>{value}</span>
    </div>
  );
}