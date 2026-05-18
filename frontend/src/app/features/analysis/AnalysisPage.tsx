import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  Calendar as CalendarIcon,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BottomNav } from "../../components/BottomNav";
import axios from "axios";

interface ExerciseRecord {
  id: number;
  exercise_name: string;
  count: number;
  duration: number;
  calories: string;
  score: number;
  accuracy_avg: string;
  completed_at: string;
  analysis?: {
    range_score?: number;
    extension_score?: number;
    stability_score?: number;
    exercise_type?: string;
    reps?: {
      rep_index?: number;
      metrics?: {
        bodyLineAngle?: number;
        bottomElbowAngle?: number;
        topElbowAngle?: number;
      };
    }[];
    range_summary?: {
      bodyStabilityRate?: number;
      rangeCompletionRate?: number;
      topExtensionRate?: number;
    };
  };
}

interface UserGoal {
  weeklyFrequency: number;
  targetCalories?: number;
}

const getKoreanName = (name: string): string => {
  if (!name) return "-";
  const lower = name.toLowerCase().trim();
  if (lower.includes("squat") || lower.includes("스쿼트")) return "스쿼트";
  if (lower.includes("push") || lower.includes("푸쉬업") || lower.includes("푸시업")) return "푸쉬업";
  if (lower.includes("plank") || lower.includes("플랭크")) return "플랭크";
  if (lower.includes("lunge") || lower.includes("런지")) return "런지";
  return name;
};

const getWeekInfo = (date: Date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const day = targetDate.getDay() || 7;
  targetDate.setDate(targetDate.getDate() + 4 - day);
  const monthStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1
  );
  const weekNumber = Math.ceil(
    ((targetDate.getTime() - monthStart.getTime()) / 86400000 + 1) / 7
  );
  return `${targetDate.getMonth() + 1}월 ${weekNumber}째주`;
};

export function AnalysisPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(now);
  const [selectedDate, setSelectedDate] = useState(now.getDate());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [exercisedDates, setExercisedDates] = useState<number[]>([]);
  const [dailyRecords, setDailyRecords] = useState<ExerciseRecord[]>([]);
  
  // 💡 [핵심] 선택한 날짜 기준 앞뒤 2일(총 5일)의 실제 데이터를 저장할 공간
  const [fiveDaysRecords, setFiveDaysRecords] = useState<{ [dateStr: string]: ExerciseRecord[] }>({});
  
  const [userGoal, setUserGoal] = useState<UserGoal | null>(null);
  const [userName, setUserName] = useState("사용자");
  const [weeklyCalories, setWeeklyCalories] = useState("0.0");

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth() + 1;

  useEffect(() => {
    const token = localStorage.getItem("gympt_access_token");
    if (!token) {
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      navigate("/");
      return;
    }
    const savedName = localStorage.getItem("gympt_user_name");
    const savedGoal = localStorage.getItem("gympt_goal");
    if (savedName) setUserName(savedName);
    if (savedGoal) {
      try {
        const parsedGoal = JSON.parse(savedGoal) as UserGoal;
        setUserGoal(parsedGoal);
      } catch (error) {
        console.error("goal parsing error:", error);
      }
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const token = localStorage.getItem("gympt_access_token");
        const response = await axios.get("/api/exercise-records/calendar", {
          params: { year: viewYear, month: viewMonth },
          headers: { Authorization: `Bearer ${token}` },
        });
        const exercisedDatesData = response.data?.exercised_dates;
        if (Array.isArray(exercisedDatesData)) {
          const dates = exercisedDatesData
            .map((d: string) => Number(d.split("-")[2]))
            .filter((num: number) => !Number.isNaN(num));
          setExercisedDates(dates);
        } else {
          setExercisedDates([]);
        }
      } catch (error) {
        console.error("calendar fetch error:", error);
        setExercisedDates([]);
      }
    };
    fetchCalendarData();
  }, [viewYear, viewMonth]);

  useEffect(() => {
    const fetchWeeklyCalories = async () => {
      try {
        const token = localStorage.getItem("gympt_access_token");
        const selDateObj = new Date(viewYear, viewMonth - 1, selectedDate);
        const day = selDateObj.getDay();
        const diffToMon = day === 0 ? -6 : 1 - day;
        const monday = new Date(selDateObj);
        monday.setDate(selDateObj.getDate() + diffToMon);

        let totalCalories = 0;
        for (let i = 0; i < 7; i++) {
          const current = new Date(monday);
          current.setDate(monday.getDate() + i);
          const dateStr = `${current.getFullYear()}-${String(
            current.getMonth() + 1
          ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;

          try {
            const response = await axios.get(`/api/exercise-records/${dateStr}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const records = Array.isArray(response.data)
              ? response.data
              : response.data?.records || [];
            const dailyCalories = records.reduce(
              (acc: number, cur: ExerciseRecord) => acc + Number(cur.calories || 0),
              0
            );
            totalCalories += dailyCalories;
          } catch {
            continue;
          }
        }
        setWeeklyCalories(totalCalories.toFixed(1));
      } catch (error) {
        console.error("weekly calories error:", error);
        setWeeklyCalories("0.0");
      }
    };
    fetchWeeklyCalories();
  }, [selectedDate, viewYear, viewMonth]);

  // 💡 [핵심 변경] 날짜 클릭 시 단일 조회가 아니라 앞뒤 2일(+ - 2일) 실제 데이터를 묶어서 전부 가져옴
  const handleDateClick = async (date: number) => {
    setSelectedDate(date);
    const centerDateObj = new Date(viewYear, viewMonth - 1, date);
    const targetDateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

    try {
      const token = localStorage.getItem("gympt_access_token");
      
      // 1. 선택한 당일의 운동 요약 데이터 가져오기
      const response = await axios.get(`/api/exercise-records/${targetDateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const targetRecords = Array.isArray(response.data) ? response.data : response.data?.records || [];
      setDailyRecords(targetRecords);
      setIsDrawerOpen(true);

      // 2. 앞뒤 2일 범위 (+-2일) 데이터 병렬 비동기 조회 시작
      const windowData: { [dateStr: string]: ExerciseRecord[] } = {};
      
      const promises = Array.from({ length: 5 }).map(async (_, i) => {
        const offset = i - 2; // -2, -1, 0, 1, 2
        const currentTargetDate = new Date(centerDateObj);
        currentTargetDate.setDate(centerDateObj.getDate() + offset);
        
        const dateStr = `${currentTargetDate.getFullYear()}-${String(
          currentTargetDate.getMonth() + 1
        ).padStart(2, "0")}-${String(currentTargetDate.getDate()).padStart(2, "0")}`;

        if (offset === 0) {
          windowData[dateStr] = targetRecords; // 당일 데이터는 이미 받았으니 재활용
          return;
        }

        try {
          const res = await axios.get(`/api/exercise-records/${dateStr}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          windowData[dateStr] = Array.isArray(res.data) ? res.data : res.data?.records || [];
        } catch {
          windowData[dateStr] = []; // 데이터 없거나 에러 시 깨끗하게 빈 배열 처리
        }
      });

      await Promise.all(promises);
      setFiveDaysRecords(windowData);

    } catch (error) {
      console.error("fetch error:", error);
      setDailyRecords([]);
      setFiveDaysRecords({});
      setIsDrawerOpen(true);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
    setSelectedDate(1);
  };

  // 💡 [핵심 변경] 수집된 +-2일 진짜 데이터를 바탕으로 진짜 '일평균 각도' 계산 후 차트 바인딩
  const chartDataList = useMemo(() => {
    if (!Array.isArray(dailyRecords)) return [];

    return dailyRecords.map((record) => {
      const koName = getKoreanName(record.exercise_name);

      const COLORS = {
        elbow: { user: "#00FFB2", ideal: "#80FFD9" },
        hip: { user: "#BF78FF", ideal: "#D9AFFF" },
      };

      let bars = [
        { key: "userAngle", name: "나의 각도", fill: COLORS.elbow.user },
        { key: "idealAngle", name: "권장 각도", fill: COLORS.elbow.ideal },
      ];

      if (koName === "푸쉬업") {
        bars = [
          { key: "userAngle", name: "나의 팔꿈치 각도", fill: COLORS.elbow.user },
          { key: "idealAngle", name: "권장 팔꿈치 각도", fill: COLORS.elbow.ideal },
          { key: "userAngle2", name: "나의 엉덩이 각도", fill: COLORS.hip.user },
          { key: "idealAngle2", name: "권장 엉덩이 각도", fill: COLORS.hip.ideal },
        ];
      } else if (koName === "플랭크") {
        bars = [
          { key: "userAngle", name: "나의 엉덩이 각도", fill: COLORS.hip.user },
          { key: "idealAngle", name: "권장 엉덩이 각도", fill: COLORS.hip.ideal },
        ];
      } else if (koName === "스쿼트" || koName === "런지") {
        bars = [
          { key: "userAngle", name: "나의 무릎 각도", fill: COLORS.elbow.user },
          { key: "idealAngle", name: "권장 무릎 각도", fill: COLORS.elbow.ideal },
        ];
      }

      const pushupIdealElbow = 55;
      const squatIdealKnee = 85;
      const lungeIdealKnee = 90;
      const plankIdealHip = 180;

      const centerDateObj = new Date(viewYear, viewMonth - 1, selectedDate);

      // +-2일 스케줄 순서대로 5개 캘린더 루프 돌며 데이터 매핑
      const multiDayData = Array.from({ length: 5 }).map((_, i) => {
        const offset = i - 2; // -2, -1, 0, 1, 2
        const d = new Date(centerDateObj);
        d.setDate(centerDateObj.getDate() + offset);

        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;

        // 해당 일자에 저장된 진짜 운동 목록들 로드
        const dayRecords = fiveDaysRecords[dateStr] || [];
        const matchingRecord = dayRecords.find((r) => getKoreanName(r.exercise_name) === koName);

        let userAngle = 0;
        let userAngle2 = 0;

        if (matchingRecord) {
          const reps = matchingRecord.analysis?.reps;
          
          // 1. 실제 회차별 실시간 데이터(reps)가 있으면 하나씩 더해 평균 각도 구하기
          if (Array.isArray(reps) && reps.length > 0) {
            let sum1 = 0, count1 = 0;
            let sum2 = 0, count2 = 0;

            reps.forEach((rep) => {
              const m = rep.metrics;
              if (!m) return;

              if (koName === "푸쉬업") {
                if (m.bottomElbowAngle) { sum1 += m.bottomElbowAngle; count1++; }
                if (m.bodyLineAngle) { sum2 += m.bodyLineAngle; count2++; }
              } else if (koName === "스쿼트" || koName === "런지") {
                const angle = m.bottomElbowAngle ?? m.topElbowAngle;
                if (angle) { sum1 += angle; count1++; }
              } else if (koName === "플랭크") {
                if (m.bodyLineAngle) { sum1 += m.bodyLineAngle; count1++; }
              }
            });

            userAngle = count1 > 0 ? Math.round(sum1 / count1) : 0;
            userAngle2 = count2 > 0 ? Math.round(sum2 / count2) : 0;
          }

          // 2. 만약 reps 내부 세부 metric 필드가 비어있다면, 당일의 전반적인 score나 accuracy_avg를 대용값으로 실시간 반영
          if (userAngle === 0) {
            userAngle = matchingRecord.score || Number(matchingRecord.accuracy_avg) || 0;
          }
          if (koName === "푸쉬업" && userAngle2 === 0) {
            userAngle2 = 165; // 푸쉬업 엉덩이 수평 기본 백업 값
          }
        }

        return {
          date: dateLabel,
          userAngle: userAngle, // 진짜 데이터가 없으면 0으로 대입되어 차트바가 노출되지 않음
          idealAngle:
            koName === "푸쉬업"
              ? pushupIdealElbow
              : koName === "스쿼트"
              ? squatIdealKnee
              : koName === "런지"
              ? lungeIdealKnee
              : plankIdealHip,
          userAngle2: userAngle2,
          idealAngle2: koName === "푸쉬업" ? plankIdealHip : 0,
        };
      });

      return {
        id: record.id,
        name: koName,
        bars,
        data: multiDayData,
      };
    });
  }, [dailyRecords, fiveDaysRecords, selectedDate, viewYear, viewMonth]);

  const daySummary = useMemo(() => {
    if (!Array.isArray(dailyRecords) || dailyRecords.length === 0) {
      return {
        calories: "0.0",
        duration: 0,
        score: 0,
        exerciseCounts: [] as { label: string; value: string }[],
        names: "-",
      };
    }

    const uniqueNames = Array.from(
      new Set(dailyRecords.map((r) => getKoreanName(r.exercise_name)))
    ).join(", ");

    const countMap = new Map<string, number>();
    dailyRecords.forEach((r) => {
      const koName = getKoreanName(r.exercise_name);
      const current = countMap.get(koName) || 0;
      countMap.set(koName, current + r.count);
    });

    const exerciseCounts = Array.from(countMap.entries()).map(([name, count]) => ({
      label: `${name} 횟수`,
      value: `${count}회`,
    }));

    const totalCalories = dailyRecords
      .reduce((acc, cur) => acc + Number(cur.calories || 0), 0)
      .toFixed(1);
    const totalDuration = dailyRecords.reduce((acc, cur) => acc + cur.duration, 0);
    const avgScore = Math.round(
      dailyRecords.reduce((acc, cur) => acc + cur.score, 0) / dailyRecords.length
    );

    return {
      calories: totalCalories,
      duration: totalDuration,
      score: avgScore,
      exerciseCounts,
      names: uniqueNames,
    };
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

    const weeklyExercisedCount = exercisedDates.filter((d) => {
      const checkDate = new Date(viewYear, viewMonth - 1, d);
      return checkDate >= monday && checkDate <= sunday;
    }).length;

    const weeklyTarget = userGoal?.weeklyFrequency || 3;

    return {
      freq: Math.min(Math.round((weeklyExercisedCount / weeklyTarget) * 100), 100),
      count:
        dailyRecords.length > 0
          ? Math.min(Math.round((dailyRecords[0].count / 20) * 100), 100)
          : 0,
      accuracy:
        dailyRecords.length > 0
          ? Math.round(
              dailyRecords.reduce((acc, record) => {
                const metrics = record.analysis?.reps?.[0]?.metrics;
                if (!metrics) {
                  return acc + (record.score || Number(record.accuracy_avg) || 80);
                }

                let score = 0;
                const koName = getKoreanName(record.exercise_name);

                if (koName === "푸쉬업") {
                  const elbowScore = 100 - Math.abs((metrics.bottomElbowAngle || 0) - 55);
                  const bodyScore = 100 - Math.abs((metrics.bodyLineAngle || 0) - 180);
                  score = (elbowScore + bodyScore) / 2;
                } else if (koName === "스쿼트") {
                  score = 100 - Math.abs((metrics.bottomElbowAngle || 0) - 85);
                } else if (koName === "런지") {
                  score = 100 - Math.abs((metrics.bottomElbowAngle || 0) - 90);
                } else if (koName === "플랭크") {
                  score = 100 - Math.abs((metrics.bodyLineAngle || 0) - 180);
                }
                return acc + Math.max(0, score);
              }, 0) / dailyRecords.length
            )
          : 0,
      label: weekLabel,
    };
  }, [selectedDate, viewYear, viewMonth, exercisedDates, userGoal, dailyRecords]);

  return (
    <div
      className="flex justify-center items-start w-full font-sans"
      style={{ minHeight: "100dvh", backgroundColor: "#111111" }}
    >
      <div
        className="flex flex-col relative overflow-y-auto overflow-x-hidden text-white"
        style={{
          width: "100%",
          maxWidth: "390px",
          minHeight: "100dvh",
          backgroundColor: "#1A1A1A",
          paddingBottom: 88,
        }}
      >
        <div className="p-5 flex flex-col relative">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[30%] bg-[#00FFB2] opacity-[0.05] blur-[100px] pointer-events-none rounded-full" />

          <header className="flex items-center justify-between mb-6 relative z-10 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          </header>

          <div className="flex items-center gap-2 mb-4 pl-1 relative z-10">
            <CalendarIcon size={18} className="text-[#00FFB2]" />
            <h2 className="text-[16px] font-semibold text-white/90">
              {userName} 님의 운동 기록
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[28px] p-5 mb-6 shadow-xl relative z-10"
          >
            <div className="flex items-center justify-between mb-6 px-1">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-2 font-semibold text-[16px]">
                <span className="text-[#00FFB2]">{viewYear}년</span>
                <span className="text-white/80">{viewMonth}월</span>
              </div>

              <button
                onClick={() => changeMonth(1)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-3 text-center">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <div key={day} className="text-[12px] text-white/40 font-medium mb-2">
                  {day}
                </div>
              ))}

              {Array.from({
                length: new Date(viewYear, viewMonth - 1, 1).getDay(),
              }).map((_, idx) => (
                <div key={`empty-${idx}`} />
              ))}

              {Array.from({
                length: new Date(viewYear, viewMonth, 0).getDate(),
              }).map((_, i) => {
                const date = i + 1;
                const isSelected = selectedDate === date;
                const isExercised = exercisedDates.includes(date);
                const isToday =
                  now.getFullYear() === viewYear &&
                  now.getMonth() + 1 === viewMonth &&
                  now.getDate() === date;

                return (
                  <button
                    key={`cal-date-${date}`}
                    onClick={() => handleDateClick(date)}
                    className="relative h-10 flex flex-col items-center justify-center"
                  >
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-[14px] transition-all ${
                        isSelected
                          ? "bg-gradient-to-br from-[#00FFB2] to-[#00CC8E] text-[#111] font-bold shadow-lg scale-110"
                          : isToday
                          ? "border border-[#00FFB2] text-[#00FFB2]"
                          : "text-gray-300"
                      }`}
                    >
                      {date}
                    </div>

                    {!isSelected && isExercised && (
                      <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#00FFB2]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-r from-white/[0.05] to-transparent border border-white/5 rounded-2xl p-5 mb-8 flex items-center justify-between relative z-10"
          >
            <div className="absolute left-0 top-0 w-1 h-full bg-[#FF5C8D]" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <Flame size={20} className="text-[#FF5C8D]" />
              </div>
              <span className="text-[15px] font-medium">주간 소모 칼로리</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-bold">{weeklyCalories}</span>
              <span className="text-[12px] text-[#FF5C8D] font-bold">KCAL</span>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 mb-4 pl-1 relative z-10">
            <Target size={18} className="text-[#5C9DFF]" />
            <h3 className="text-[16px] font-semibold">목표 달성 현황</h3>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] border border-white/10 rounded-[28px] p-6 flex flex-col gap-6 relative z-10 mb-10"
          >
            <AnimatedProgressBar
              label={`${achievement.label} 운동 횟수`}
              percent={achievement.freq}
              gradientFrom="#00FFB2"
              gradientTo="#00B8FF"
              delay={0.2}
            />
            <AnimatedProgressBar
              label="일일 목표 달성"
              percent={achievement.count}
              gradientFrom="#5C9DFF"
              gradientTo="#9D5CFF"
              delay={0.4}
            />
            <AnimatedProgressBar
              label="평균 정확도"
              percent={achievement.accuracy}
              gradientFrom="#B35CFF"
              gradientTo="#FF5C8D"
              delay={0.6}
            />
          </motion.div>
        </div>

        <div
          style={{
            display: isDrawerOpen ? "flex" : "none",
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            zIndex: 9999,
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={() => setIsDrawerOpen(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1E1E1E] w-full max-w-[390px] mx-auto h-[75vh] rounded-t-[32px] p-6 flex flex-col shadow-2xl border-t border-white/10 overflow-hidden"
          >
            <div className="w-10 h-1 bg-white/20 rounded-full self-center mb-6" />

            <h3 className="text-white text-center text-[18px] font-bold mb-6">
              {viewYear}.{viewMonth.toString().padStart(2, "0")}.
              {selectedDate.toString().padStart(2, "0")} 운동 요약
            </h3>

            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 mb-6">
              <DetailRow
                label="운동 종목"
                value={daySummary.names}
                valueColor="text-white"
              />
              <DetailRow
                label="총 운동 시간"
                value={`${Math.floor(daySummary.duration / 60)}분 ${daySummary.duration % 60}초`}
                valueColor="text-[#00FFB2]"
              />
              <DetailRow
                label="소모 칼로리"
                value={`${daySummary.calories} kcal`}
                valueColor="text-[#FF5C8D]"
              />
              {daySummary.exerciseCounts.map((item, idx) => (
                <DetailRow
                  key={`count-row-${idx}`}
                  label={item.label}
                  value={item.value}
                  valueColor="text-[#BF78FF]"
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-[#FFB000]" />
                <h4 className="text-[15px] font-semibold">
                  운동별 일평균 자세 분석 (+-2일 추이)
                </h4>
              </div>

              <div className="w-full pb-10">
                {chartDataList.length > 0 ? (
                  <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 hide-scrollbar">
                    {chartDataList.map((exercise, idx) => (
                      <div
                        key={`exercise-chart-${exercise.id}-${idx}`}
                        className="min-w-full snap-center px-2"
                      >
                        <p className="text-[12px] text-white/40 mb-3 text-center">
                          {exercise.name} 일별 평균 각도
                        </p>

                        <div style={{ width: "100%", height: "280px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={exercise.data}
                              margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#ffffff10"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                stroke="#ffffff50"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                domain={[0, 180]}
                                stroke="#ffffff50"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                cursor={{ fill: "#ffffff05" }}
                                contentStyle={{
                                  backgroundColor: "#111",
                                  border: "none",
                                  borderRadius: "12px",
                                }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconSize={8}
                                iconType="circle"
                                wrapperStyle={{ paddingTop: "30px" }}
                              />
                              {exercise.bars.map((bar) => (
                                <Bar
                                  key={bar.key}
                                  dataKey={bar.key}
                                  name={bar.name}
                                  fill={bar.fill}
                                  radius={[2, 2, 0, 0]}
                                  barSize={10}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-center text-[11px] text-white/35 mt-3 leading-relaxed">
                            이상적 자세 기준:
                            {exercise.name === "푸쉬업"
                              ? " 팔꿈치 각도 55°"
                              : exercise.name === "스쿼트"
                              ? " 무릎 각도 85°"
                              : exercise.name === "런지"
                              ? " 무릎 각도 90°"
                              : " 엉덩이 각도 180°"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full py-10 text-center text-white/30 text-[14px]">
                    기록된 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>

        <BottomNav />
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div className="flex justify-between items-start py-1 gap-4">
      <span className="text-[14px] text-white/60 shrink-0">{label}</span>
      <span className={`text-[15px] font-bold ${valueColor} break-all text-right`}>
        {value}
      </span>
    </div>
  );
}

function AnimatedProgressBar({
  label,
  percent,
  gradientFrom,
  gradientTo,
  delay,
}: {
  label: string;
  percent: number;
  gradientFrom: string;
  gradientTo: string;
  delay: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <span className="text-[13px] text-white/80">{label}</span>
        <span className="text-[14px] font-bold" style={{ color: gradientFrom }}>
          {percent}%
        </span>
      </div>
      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ delay, duration: 1.2 }}
          className="h-full"
          style={{
            background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
          }}
        />
      </div>
    </div>
  );
}
