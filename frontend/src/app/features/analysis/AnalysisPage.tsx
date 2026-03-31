import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Flame, Target, Calendar as CalendarIcon, Activity } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BottomNav } from "../../components/BottomNav";

export function AnalysisPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<number>(9);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const userName = "User";

  const perfectDays = [3, 9, 10, 15, 18, 24]; 
  const warningDays = [7, 13, 22]; 

  const exercisesData = useMemo(() => {
    const dates = ["3/3", "3/9", "3/10", "3/15", "3/18", "3/24"];
    return [
      {
        id: "squat",
        name: "스쿼트 (무릎)",
        bars: [
          { key: "userAngle", name: "나의 무릎 각도", fill: "#00FFB2" },
          { key: "idealAngle", name: "이상적인 무릎 각도", fill: "#5C9DFF" }
        ],
        data: dates.map((date, index) => ({
          date,
          userAngle: 80 + ((index * 17) % 51), 
          idealAngle: 130,
          id: `squat-item-${index}`
        }))
      },
      {
        id: "lunge",
        name: "런지 (무릎)",
        bars: [
          { key: "userAngle", name: "나의 무릎 각도", fill: "#00FFB2" },
          { key: "idealAngle", name: "이상적인 무릎 각도", fill: "#5C9DFF" }
        ],
        data: dates.map((date, index) => ({
          date,
          userAngle: 80 + ((index * 23) % 51),
          idealAngle: 130,
          id: `lunge-item-${index}`
        }))
      },
      {
        id: "pushup",
        name: "푸쉬업 (팔꿈치 & 엉덩이)",
        bars: [
          { key: "userAngle", name: "나의 팔꿈치 각도", fill: "#00FFB2" },
          { key: "idealAngle", name: "이상적인 팔꿈치 각도", fill: "#5C9DFF" },
          { key: "userAngle2", name: "나의 엉덩이 각도", fill: "#FFB000" },
          { key: "idealAngle2", name: "이상적인 엉덩이 각도", fill: "#FF5C8D" }
        ],
        data: dates.map((date, index) => ({
          date,
          userAngle: 80 + ((index * 11) % 51),
          idealAngle: 130,
          userAngle2: 150 + ((index * 7) % 21),
          idealAngle2: 180,
          id: `pushup-item-${index}`
        }))
      },
      {
        id: "plank",
        name: "플랭크 (엉덩이)",
        bars: [
          { key: "userAngle", name: "나의 엉덩이 각도", fill: "#00FFB2" },
          { key: "idealAngle", name: "이상적인 엉덩이 각도", fill: "#5C9DFF" }
        ],
        data: dates.map((date, index) => ({
          date,
            userAngle: 80 + ((index * 13) % 51), 
            idealAngle: 130,
            id: `plank-item-${index}`
        }))
      }
    ];
  }, []);

  const handleDateClick = (date: number) => {
    setSelectedDate(date);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex justify-center items-start w-full font-sans" style={{ minHeight: '100dvh', backgroundColor: '#111111' }}>
      
      <div 
        className="flex flex-col relative overflow-y-auto overflow-x-hidden text-white" 
        style={{ width: '100%', maxWidth: '390px', minHeight: '100dvh', backgroundColor: '#1A1A1A', paddingBottom: 88 }}
      >
        <div className="p-5 flex flex-col relative">
          {/* Background Glow Effects */}
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[30%] bg-[#00FFB2] opacity-[0.05] blur-[100px] pointer-events-none rounded-full"></div>
          <div className="absolute top-[40%] right-[-20%] w-[50%] h-[40%] bg-[#5C9DFF] opacity-[0.05] blur-[120px] pointer-events-none rounded-full"></div>

          {/* Header */}
          <header className="flex items-center justify-between mb-6 relative z-10 pt-2">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors backdrop-blur-md"
            >
              <ChevronLeft className="text-white" size={24} />
            </button>
            <span className="text-[17px] font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            </span>
            <div className="w-10"></div>
          </header>

          <div className="flex items-center gap-2 mb-4 pl-1 relative z-10">
            <CalendarIcon size={18} className="text-[#00FFB2]" />
            <h2 className="text-[16px] font-semibold text-white/90">{userName} 운동 일지</h2>
          </div>

          {/* Glassmorphism Calendar Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[28px] p-5 mb-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative z-10"
          >
            <div className="flex items-center justify-between mb-6 px-1">
              <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-3 font-semibold text-[16px] tracking-wide cursor-pointer hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors">
                <span className="text-[#00FFB2]">March</span>
                <span className="text-white/80">2026</span>
              </div>
              
              <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                <div key={day} className={`text-center text-[11px] font-semibold tracking-wider ${idx === 0 ? 'text-[#FF5C8D]' : 'text-gray-500'}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center text-[14px]">
              {Array.from({ length: 31 }).map((_, i) => {
                const date = i + 1;
                const isSelected = selectedDate === date;
                const isPerfect = perfectDays.includes(date);
                const isWarning = warningDays.includes(date);

                return (
                  <button 
                    key={date}
                    onClick={() => handleDateClick(date)}
                    className="relative h-10 flex flex-col items-center justify-center group"
                  >
                    <div className={`
                      w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 z-10 text-[14px]
                      ${isSelected ? 'bg-gradient-to-br from-[#00FFB2] to-[#00CC8E] text-[#111111] font-bold shadow-[0_0_16px_rgba(0,255,178,0.5)] scale-110' : 'text-gray-300 font-medium group-hover:bg-white/10'}
                    `}>
                      {date}
                    </div>
                    
                    {!isSelected && (isPerfect || isWarning) && (
                      <div className="absolute bottom-0.5 flex gap-1">
                        {isPerfect && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB2] shadow-[0_0_6px_rgba(0,255,178,0.8)]"></span>
                        )}
                        {isWarning && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFB000] shadow-[0_0_6px_rgba(255,176,0,0.8)]"></span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-end gap-5 mb-8 text-[12px] text-white/70 pr-2 font-medium relative z-10"
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00FFB2] shadow-[0_0_8px_rgba(0,255,178,0.6)]"></div>
              <span>완벽한 자세</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFB000] shadow-[0_0_8px_rgba(255,176,0,0.6)]"></div>
              <span>교정 필요</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-gradient-to-r from-white/[0.05] to-transparent border border-white/5 rounded-2xl p-5 mb-8 flex items-center justify-between relative z-10 overflow-hidden"
          >
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-[#FF5C8D] to-[#FF8FA3]"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Flame size={20} className="text-[#FF5C8D]" />
              </div>
              <span className="text-[15px] font-medium text-white/90">주간 소모 칼로리</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 tracking-tight">787</span>
              <span className="text-[12px] text-[#FF5C8D] font-bold">KCAL</span>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 mb-4 pl-1 relative z-10">
            <Target size={18} className="text-[#5C9DFF]" />
            <h3 className="text-[16px] font-semibold text-white/90">운동목표 달성</h3>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[28px] p-6 flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative z-10 mb-10"
          >
            <AnimatedProgressBar 
              label="주간 운동 횟수" 
              percent={65} 
              gradientFrom="#00FFB2" 
              gradientTo="#00B8FF"
              delay={0.5}
            />
            <div className="h-px w-full bg-white/5 rounded-full"></div>
            <AnimatedProgressBar 
              label="주간 목표 개수" 
              percent={45} 
              gradientFrom="#5C9DFF" 
              gradientTo="#9D5CFF"
              delay={0.7}
            />
            <div className="h-px w-full bg-white/5 rounded-full"></div>
            <AnimatedProgressBar 
              label="평균 정확도" 
              percent={85} 
              gradientFrom="#B35CFF" 
              gradientTo="#FF5C8D"
              delay={0.9}
            />
          </motion.div>

        </div> 

        {/* Bottom Sheet (Drawer) */}
        <div 
          style={{ 
            display: isDrawerOpen ? 'flex' : 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 9999,
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}
          onClick={() => setIsDrawerOpen(false)}
        >
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1E1E1E',
              width: '100%',
              maxWidth: '390px',
              height: '80vh',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 24px 0px 24px',
              boxSizing: 'border-box',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div 
              style={{
                width: '40px',
                height: '5px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '99px',
                marginBottom: '20px',
                flexShrink: 0
              }}
            />
            
            <div className="w-full flex-1 flex flex-col gap-4 overflow-y-auto overflow-x-hidden pb-8 hide-scrollbar">
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px' }}>
                2026년 03월 {selectedDate.toString().padStart(2, '0')}일 운동내용
              </h3>
              
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 w-full">
                <DetailRow label="운동시간" value="00:45:00" valueColor="text-[#00FFB2]" />
                <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                
                <DetailRow label="칼로리 소모" value="150 KCAL" valueColor="text-[#FF5C8D]" />
                <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                
                <DetailRow label="운동점수" value="87 점" valueColor="text-[#5C9DFF]" />
                <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                
                <DetailRow label="운동개수 - 스쿼트" value="12개" valueColor="text-white" />
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mt-2 w-full">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-[#FFB000]" />
                  <h4 className="text-[15px] font-semibold text-white/90">관절 각도 변화 추이</h4>
                  <span className="text-[10px] text-white/40 ml-auto">옆으로 스와이프 하세요 👉</span>
                </div>
                
                {/* 🚨 Slider 대신 CSS 가로 스크롤(snap)을 적용한 영역 🚨 */}
                <div className="w-full flex overflow-x-auto snap-x snap-mandatory gap-4 hide-scrollbar pb-2">
                  {exercisesData.map((exercise, exerciseIdx) => (
                    <div 
                      key={`drawer-slide-${exercise.id}-${exerciseIdx}`} 
                      className="flex-shrink-0 w-full snap-center focus:outline-none"
                    >
                      <div className="flex justify-between items-center mb-3 px-1">
                        <span className="text-[11px] text-white/50 font-medium">나의 각도 vs 이상적 각도</span>
                        <span className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded-md">{exercise.name}</span>
                      </div>
                      
                      <div style={{ width: '100%', height: '200px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={exercise.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} id={`barchart-${exercise.id}`}>
                            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis key="xaxis" dataKey="date" stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                            <YAxis key="yaxis" stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} domain={[60, 150]} />
                            <Tooltip 
                              key="tooltip"
                              cursor={{ fill: '#ffffff05' }}
                              contentStyle={{ backgroundColor: '#111111', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 999 }}
                              itemStyle={{ color: '#fff' }}
                              isAnimationActive={false}
                            />
                            <Legend 
                              key="legend" 
                              wrapperStyle={{ 
                                fontSize: '9px', 
                                paddingTop: '5px', 
                                paddingBottom: '20px', 
                                width: '100%', 
                                left: 0,
                                lineHeight: '1.4'
                              }} 
                              iconType="circle" 
                              iconSize={5} 
                            />
                            {exercise.bars.map((bar) => (
                              <Bar 
                                key={`bar-${bar.key}`} 
                                dataKey={bar.key} 
                                name={bar.name} 
                                fill={bar.fill} 
                                radius={[3, 3, 0, 0]} 
                                barSize={exercise.bars.length > 2 ? 4 : 6} 
                                isAnimationActive={false} 
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>

                <style>{`
                  .recharts-legend-wrapper {
                    width: 100% !important;
                    position: absolute !important;
                    left: 0 !important;
                    right: 0 !important;
                  }
                  .recharts-default-legend {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    justify-content: center !important;
                    gap: 4px 12px !important;
                    padding-left: 20px !important;
                  }
                  .recharts-default-legend .recharts-legend-item {
                    margin-right: 0 !important;
                  }
                  .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                  .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}</style>
              </div>
            </div>
          </motion.div>
        </div>
      </div> 
      
      <BottomNav />

    </div>
  );
}

// Detail Row Component inside Drawer
function DetailRow({ label, value, valueColor }: { label: string, value: string, valueColor: string }) {
  return (
    <div className="flex justify-between items-center px-1">
      <span className="text-[13px] text-white/80 font-medium">{label}</span>
      <span className={`text-[20px] font-semibold tracking-wider ${valueColor}`}>{value}</span>
    </div>
  );
}

// Animated Progress Bar Component
function AnimatedProgressBar({ 
  label, 
  percent, 
  gradientFrom, 
  gradientTo,
  delay 
}: { 
  label: string; 
  percent: number; 
  gradientFrom: string; 
  gradientTo: string;
  delay: number;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between items-end">
        <span className="text-[14px] text-white/90 font-medium tracking-wide">{label}</span>
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.5, duration: 0.5 }}
          className="text-[16px] font-bold" 
          style={{ color: gradientFrom }}
        >
          {percent}%
        </motion.span>
      </div>
      
      <div className="h-3.5 w-full bg-[#1A1F26] rounded-full overflow-hidden border border-white/5 shadow-inner relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ delay, duration: 1.5, ease: "easeOut" }}
          className="h-full rounded-full relative overflow-hidden"
          style={{ 
            background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
            boxShadow: `0 0 12px ${gradientFrom}80`
          }}
        >
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-full blur-[1px]"></div>
        </motion.div>
      </div>
    </div>
  );
}