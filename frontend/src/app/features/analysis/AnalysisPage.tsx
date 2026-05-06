import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flame, Target, Calendar as CalendarIcon, Activity } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BottomNav } from "../../components/BottomNav";
import axios from "axios";

// 🚨 슬라이더 라이브러리 및 CSS
import Slider from "react-slick";
const SliderComponent = (Slider as any).default || Slider;
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

// 인터페이스 정의 (서버 응답 데이터 구조)
interface ExerciseRecord {
  id: number;
  exercise_name: string;
  count: number;
  duration: number;
  calories: string;
  score: number;
  accuracy_avg: string;
  completed_at: string;
  analysis: {
    range_score: number;
    extension_score: number;
    stability_score: number;
    range_summary: {
      bodyStabilityRate: number;
      rangeCompletionRate: number;
      topExtensionRate: number;
    };
  };
}

const getWeekInfo = (date: Date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const day = targetDate.getDay() || 7;
  targetDate.setDate(targetDate.getDate() + 4 - day);
  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const weekNumber = Math.ceil(((targetDate.getTime() - monthStart.getTime()) / 86400000 + 1) / 7);
  return `${targetDate.getMonth() + 1}월 ${weekNumber}째주`;
};

export function AnalysisPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(now);
  const [selectedDate, setSelectedDate] = useState<number>(now.getDate());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [exercisedDates, setExercisedDates] = useState<number[]>([]);
  const [dailyRecords, setDailyRecords] = useState<ExerciseRecord[]>([]);
  const [userGoal, setUserGoal] = useState<any>(null);
  const [userName, setUserName] = useState("사용자");

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth() + 1;

  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
  };

  useEffect(() => {
    const token = localStorage.getItem("gympt_access_token");
    const name = localStorage.getItem("gympt_user_name");
    const goal = localStorage.getItem("gympt_goal");
    if (!token) {
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      navigate("/");
      return;
    }
    if (name) setUserName(name);
    if (goal) {
      try { setUserGoal(JSON.parse(goal)); } catch (e) { console.error("Goal 파싱 에러", e); }
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const token = localStorage.getItem("gympt_access_token");
        const response = await axios.get("/api/exercise-records/calendar", {
          params: { year: viewYear, month: viewMonth },
          headers: { Authorization: `Bearer ${token}` }
        });

        const dates = response.data.exercised_dates.map((d: string) => 
          parseInt(d.split("-")[2])
        );
        setExercisedDates(dates);
      } catch (error) {
        console.error("캘린더 데이터 조회 실패:", error);
      }
    };
    fetchCalendarData();
  }, [viewYear, viewMonth]);

  const handleDateClick = async (date: number) => {
    setSelectedDate(date);
    const targetDateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    
    try {
      const token = localStorage.getItem("gympt_access_token");
      const response = await axios.get(`/api/exercise-records/${targetDateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDailyRecords(response.data);  
      setIsDrawerOpen(true);
    } catch (error) {
      console.error("상세 기록 조회 실패:", error);
      setDailyRecords([]);  
      setIsDrawerOpen(true);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const chartDataList = useMemo(() => {
    return dailyRecords.map((record) => {
      const COLORS = {
        elbow: { user: "#00FFB2", ideal: "#80FFD9" },
        hip: { user: "#BF78FF", ideal: "#D9AFFF" }  
      };

      let bars = [
        { key: "userAngle", name: "나의 각도", fill: COLORS.elbow.user },
        { key: "idealAngle", name: "권장 각도", fill: COLORS.elbow.ideal }
      ];

      if (record.exercise_name === "푸쉬업") {
        bars = [
          { key: "userAngle", name: "나의 팔꿈치 각도", fill: COLORS.elbow.user },
          { key: "idealAngle", name: "권장 팔꿈치 각도", fill: COLORS.elbow.ideal },
          { key: "userAngle2", name: "나의 엉덩이 각도", fill: COLORS.hip.user },
          { key: "idealAngle2", name: "권장 엉덩이 각도", fill: COLORS.hip.ideal }
        ];
      } else if (record.exercise_name === "플랭크") {
        bars = [
          { key: "userAngle", name: "나의 엉덩이 각도", fill: COLORS.hip.user },
          { key: "idealAngle", name: "권장 엉덩이 각도", fill: COLORS.hip.ideal }
        ];
      }

      const multiDayData = Array.from({ length: 5 }).map((_, i) => {
        const offset = i - 2;
        const d = new Date(viewYear, viewMonth - 1, selectedDate + offset);
        const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
        const isSelected = offset === 0;

        return {
          date: dateLabel,
          userAngle: isSelected ? record.analysis.range_score : record.analysis.range_score - (Math.random() * 15),
          idealAngle: 130,
          userAngle2: isSelected ? record.analysis.stability_score : record.analysis.stability_score - (Math.random() * 10),
          idealAngle2: 180,
        };
      });

      return { id: record.id, name: record.exercise_name, bars, data: multiDayData };
    });
  }, [dailyRecords, selectedDate, viewYear, viewMonth]);

  const daySummary = useMemo(() => {
    if (dailyRecords.length === 0) return { calories: "0.0", duration: 0, score: 0, exerciseCounts: [], names: "-" };
    const uniqueNames = Array.from(new Set(dailyRecords.map(r => r.exercise_name))).join(", ");
    const countMap = new Map<string, number>();
    dailyRecords.forEach(r => {
      const current = countMap.get(r.exercise_name) || 0;
      countMap.set(r.exercise_name, current + r.count);
    });
    const exerciseCounts = Array.from(countMap.entries()).map(([name, count]) => ({
      label: `${name} 횟수`, value: `${count}회`
    }));
    const totalCalories = dailyRecords.reduce((acc, cur) => acc + parseFloat(cur.calories), 0).toFixed(1);
    const totalDuration = dailyRecords.reduce((acc, cur) => acc + cur.duration, 0);
    const avgScore = Math.round(dailyRecords.reduce((acc, cur) => acc + cur.score, 0) / dailyRecords.length);

    return { calories: totalCalories, duration: totalDuration, score: avgScore, exerciseCounts, names: uniqueNames };
  }, [dailyRecords]);

  const achievement = useMemo(() => {
    const selDateObj = new Date(viewYear, viewMonth - 1, selectedDate);
    const weekLabel = getWeekInfo(selDateObj);
    const day = selDateObj.getDay(); 
    const diffToMon = day === 0 ? -6 : 1 - day; 
    const monday = new Date(selDateObj);
    monday.setDate(selDateObj.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weeklyExercisedCount = exercisedDates.filter(d => {
      const checkDate = new Date(viewYear, viewMonth - 1, d);
      return checkDate >= monday && checkDate <= sunday;
    }).length;

    const weeklyTarget = userGoal?.weeklyFrequency || 3;

    return {
      freq: Math.min(Math.round((weeklyExercisedCount / weeklyTarget) * 100), 100),
      count: dailyRecords.length > 0 ? Math.min(Math.round((dailyRecords[0].count / 20) * 100), 100) : 0,
      accuracy: dailyRecords.length > 0 ? Math.round(parseFloat(dailyRecords[0].accuracy_avg)) : 0,
      label: weekLabel
    };
  }, [selectedDate, viewYear, viewMonth, exercisedDates, userGoal, dailyRecords]);

  return (
    <div className="flex justify-center items-start w-full font-sans" style={{ minHeight: '100dvh', backgroundColor: '#111111' }}>
      <div className="flex flex-col relative overflow-y-auto overflow-x-hidden text-white" style={{ width: '100%', maxWidth: '390px', minHeight: '100dvh', backgroundColor: '#1A1A1A', paddingBottom: 88 }}>
        <div className="p-5 flex flex-col relative">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[30%] bg-[#00FFB2] opacity-[0.05] blur-[100px] pointer-events-none rounded-full" />
          
          <header className="flex items-center justify-between mb-6 relative z-10 pt-2">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
          </header>

          <div className="flex items-center gap-2 mb-4 pl-1 relative z-10">
            <CalendarIcon size={18} className="text-[#00FFB2]" />
            <h2 className="text-[16px] font-semibold text-white/90">{userName} 님의 운동 기록</h2>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[28px] p-5 mb-6 shadow-xl relative z-10">
            <div className="flex items-center justify-between mb-6 px-1">
              <button onClick={() => changeMonth(-1)} className="p-2 text-gray-400 hover:text-white"><ChevronLeft size={20} /></button>
              <div className="flex items-center gap-2 font-semibold text-[16px]">
                <span className="text-[#00FFB2]">{viewYear}년</span> <span className="text-white/80">{viewMonth}월</span>
              </div>
              <button onClick={() => changeMonth(1)} className="p-2 text-gray-400 hover:text-white"><ChevronRight size={20} /></button>
            </div>

            <div className="grid grid-cols-7 gap-y-3 text-center">
              {Array.from({ length: new Date(viewYear, viewMonth, 0).getDate() }).map((_, i) => {
                const date = i + 1;
                const isSelected = selectedDate === date;
                const isExercised = exercisedDates.includes(date);
                const isToday = now.getFullYear() === viewYear && (now.getMonth() + 1) === viewMonth && now.getDate() === date;
                return (
                  <button key={date} onClick={() => handleDateClick(date)} className="relative h-10 flex flex-col items-center justify-center">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[14px] transition-all
                      ${isSelected ? 'bg-gradient-to-br from-[#00FFB2] to-[#00CC8E] text-[#111] font-bold shadow-lg scale-110' : 
                        isToday ? 'border border-[#00FFB2] text-[#00FFB2]' : 'text-gray-300'}`}>
                      {date}
                    </div>
                    {!isSelected && isExercised && <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#00FFB2]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-r from-white/[0.05] to-transparent border border-white/5 rounded-2xl p-5 mb-8 flex items-center justify-between relative z-10">
            <div className="absolute left-0 top-0 w-1 h-full bg-[#FF5C8D]" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><Flame size={20} className="text-[#FF5C8D]" /></div>
              <span className="text-[15px] font-medium">소모 칼로리</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-bold">{daySummary.calories}</span>
              <span className="text-[12px] text-[#FF5C8D] font-bold">KCAL</span>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 mb-4 pl-1 relative z-10"><Target size={18} className="text-[#5C9DFF]" /><h3 className="text-[16px] font-semibold">목표 달성 현황</h3></div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.03] border border-white/10 rounded-[28px] p-6 flex flex-col gap-6 relative z-10 mb-10">
            <AnimatedProgressBar label={`${achievement.label} 운동 횟수`} percent={achievement.freq} gradientFrom="#00FFB2" gradientTo="#00B8FF" delay={0.2} />
            <AnimatedProgressBar label="일일 목표 달성" percent={achievement.count} gradientFrom="#5C9DFF" gradientTo="#9D5CFF" delay={0.4} />
            <AnimatedProgressBar label="평균 정확도" percent={achievement.accuracy} gradientFrom="#B35CFF" gradientTo="#FF5C8D" delay={0.6} />
          </motion.div>
        </div>

        {/* 상세 분석 드로어 */}
        <div style={{ display: isDrawerOpen ? 'flex' : 'none', position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, flexDirection: 'column', justifyContent: 'flex-end' }} onClick={() => setIsDrawerOpen(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-[#1E1E1E] w-full max-w-[390px] mx-auto h-[75vh] rounded-t-[32px] p-6 flex flex-col shadow-2xl border-t border-white/10 overflow-hidden">
            <div className="w-10 h-1 bg-white/20 rounded-full self-center mb-6" />
            <h3 className="text-white text-center text-[18px] font-bold mb-6">{viewYear}.{viewMonth.toString().padStart(2, '0')}.{selectedDate.toString().padStart(2, '0')} 운동 요약</h3>
            
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 mb-6">
              <DetailRow label="운동 종목" value={daySummary.names} valueColor="text-white" />
              <DetailRow label="총 운동 시간" value={`${Math.floor(daySummary.duration / 60)}분 ${daySummary.duration % 60}초`} valueColor="text-[#00FFB2]" />
              <DetailRow label="평균 점수" value={`${daySummary.score}점`} valueColor="text-[#5C9DFF]" />
              {daySummary.exerciseCounts.map((item, idx) => (
                <DetailRow key={`count-${idx}`} label={item.label} value={item.value} valueColor="text-[#BF78FF]" />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar">
              <div className="flex items-center gap-2 mb-4"><Activity size={16} className="text-[#FFB000]" /><h4 className="text-[15px] font-semibold">운동별 자세 분석</h4></div>
              <div className="w-full pb-10">
                {chartDataList.length > 0 ? (
                  <SliderComponent {...sliderSettings} className="history-drawer-chart-slider">
                    {chartDataList.map((exercise, i) => (
                      <div key={`drawer-slide-${exercise.id}-${i}`} className="w-full outline-none px-2">
                        <p className="text-[12px] text-white/40 mb-3 text-center">{exercise.name} 자세 추이</p>
                        <div style={{ width: '100%', height: '280px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={exercise.data} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                              <XAxis dataKey="date" stroke="#ffffff50" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis domain={[0, 180]} stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px' }} />
                              <Legend 
                                verticalAlign="bottom" align="center" iconSize={8} iconType="circle"
                                wrapperStyle={{ paddingTop: '30px', width: '100%', left: 0, display: 'flex', justifyContent: 'center' }} 
                                content={(props) => (
                                  <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-4">
                                    {props.payload?.map((entry: any, index: number) => (
                                      <li key={`item-${index}`} className="flex items-center gap-1.5" style={{ minWidth: '110px' }}>
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-[10px] font-medium text-white/80 whitespace-nowrap">{entry.value}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              />
                              {exercise.bars.map((bar) => (
                                <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.fill} radius={[2, 2, 0, 0]} barSize={10} />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </SliderComponent>
                ) : (
                  <div className="w-full py-10 text-center text-white/30 text-[14px]">기록된 데이터가 없습니다.</div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .history-drawer-chart-slider .slick-dots li button:before { color: white; opacity: 0.2; }
          .history-drawer-chart-slider .slick-dots li.slick-active button:before { color: #00FFB2; opacity: 1; }
          .slick-list { cursor: grab; }
          .slick-list:active { cursor: grabbing; }
        `}</style>
      </div>
      <BottomNav />
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string, value: string, valueColor: string }) {
  return (
    <div className="flex justify-between items-start py-1 gap-4">
      <span className="text-[14px] text-white/60 shrink-0">{label}</span>
      <span className={`text-[15px] font-bold ${valueColor} break-all text-right`}>{value}</span>
    </div>
  );
}

function AnimatedProgressBar({ label, percent, gradientFrom, gradientTo, delay }: any) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <span className="text-[13px] text-white/80">{label}</span>
        <span className="text-[14px] font-bold" style={{ color: gradientFrom }}>{percent}%</span>
      </div>
      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ delay, duration: 1.2 }} className="h-full" style={{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }} />
      </div>
    </div>
  );
}