import pushupImg from "../../../../assets/exercises/pushup.png";
import squatImg from "../../../../assets/exercises/squat.png";
import lungeImg from "../../../../assets/exercises/lunge.png";
import plankImg from "../../../../assets/exercises/plank.png";

export interface WorkoutExerciseConfig {
  id: string;
  backendExerciseId: number;
  name: string;
  analysisName: string;
  iconSrc: string;
  targetCount: number;
  isTimeBased?: boolean;
  idleFeedback: string;
  calibrationTitle: string;
  calibrationIntro: string;
  calibrationActiveTop: string;
  calibrationActiveBottom: string;
}

export const WORKOUT_EXERCISES: Record<string, WorkoutExerciseConfig> = {
  pushup: {
    id: "pushup",
    backendExerciseId: 1,
    name: "푸쉬업",
    analysisName: "푸쉬업 AI 분석",
    iconSrc: pushupImg,
    targetCount: 10,
    idleFeedback: "카메라를 시작하면 실시간 푸쉬업 피드백을 제공합니다.",
    calibrationTitle: "푸쉬업 초기 범위 설정",
    calibrationIntro: "탑 자세와 바텀 자세를 순서대로 측정합니다.",
    calibrationActiveTop: "팔을 곧게 편 탑 자세를 유지해주세요.",
    calibrationActiveBottom: "가슴을 충분히 내린 바텀 자세를 유지해주세요.",
  },
  squat: {
    id: "squat",
    backendExerciseId: 2,
    name: "스쿼트",
    analysisName: "스쿼트 AI 분석",
    iconSrc: squatImg,
    targetCount: 10,
    idleFeedback: "카메라를 시작하면 실시간 스쿼트 피드백을 제공합니다.",
    calibrationTitle: "스쿼트 범위 설정",
    calibrationIntro: "본인의 관절 최대 가동 범위를 설정하는 단계입니다.",
    calibrationActiveTop: "기준 자세를 유지해주세요.",
    calibrationActiveBottom: "고통을 느끼지 않을 범위까지 최대한 내려가주세요.",
  },
  lunge: {
    id: "lunge",
    backendExerciseId: 3,
    name: "런지",
    analysisName: "런지 AI 분석",
    iconSrc: lungeImg,
    targetCount: 10,
    idleFeedback: "카메라를 시작하면 실시간 런지 피드백을 제공합니다.",
    calibrationTitle: "런지 범위 설정",
    calibrationIntro: "본인의 관절 최대 가동 범위를 설정하는 단계입니다.",
    calibrationActiveTop: "측면으로 서서 시작 자세를 유지해주세요.",
    calibrationActiveBottom: "앞무릎을 굽혀 통증 없는 범위까지 내려가 주세요.",
  },
  plank: {
    id: "plank",
    backendExerciseId: 4,
    name: "플랭크",
    analysisName: "플랭크 AI 분석",
    iconSrc: plankImg,
    targetCount: 60,
    isTimeBased: true,
    idleFeedback: "카메라를 시작하면 실시간 플랭크 피드백을 제공합니다.",
    calibrationTitle: "플랭크 자세 설정",
    calibrationIntro: "측면으로 플랭크 자세를 취하면 자동으로 3초간 측정합니다.",
    calibrationActiveTop: "측면으로 플랭크 자세를 유지해주세요.",
    calibrationActiveBottom: "",
  },
};

export const PUSHUP_KCAL_PER_REP = 0.4;
export const PLANK_KCAL_PER_SECOND = 0.06;
