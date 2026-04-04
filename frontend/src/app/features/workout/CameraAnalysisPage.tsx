import { useRef } from "react";
import { useNavigate } from "react-router";

import squatImg from "../../../assets/exercises/squat.png";
import { CameraStage } from "./components/CameraStage";
import { WorkoutHeader } from "./components/WorkoutHeader";
import { useCameraPreview } from "./hooks/useCameraPreview";
import { usePoseLandmarker } from "./hooks/usePoseLandmarker";
import { useSquatAnalysis } from "./hooks/useSquatAnalysis";
import type { ExerciseInfo } from "./types/workoutSession";

const TEXT = {
  exerciseName: "스쿼트 AI 분석",
  finishWorkout: "운동 종료",
  feedbackTitle: "AI 실시간 피드백",
  idleFeedback: "카메라를 시작하면 실시간 스쿼트 피드백을 제공합니다.",
  modelLoading: "AI 자세 모델을 불러오는 중입니다...",
  modelError: "AI 자세 분석을 시작할 수 없습니다.",
  detecting: "랜드마크를 기반으로 자세를 분석 중입니다.",
  searching: "화면에서 자세를 찾고 있습니다.",
} as const;

const DEFAULT_EXERCISE: ExerciseInfo = {
  id: "squat",
  name: TEXT.exerciseName,
  iconSrc: squatImg,
  targetCount: 10,
};

export function CameraAnalysisPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    cameraStatus,
    cameraErrorMessage,
    isStreaming,
    requestCamera,
    stopCamera,
  } = useCameraPreview(videoRef);

  const { analysis, onPoseLandmarks } = useSquatAnalysis({
    enabled: isStreaming,
  });

  const {
    poseStatus,
    poseErrorMessage,
    hasPoseLandmarks,
  } = usePoseLandmarker({
    enabled: isStreaming,
    videoRef,
    canvasRef,
    onPoseLandmarks,
  });

  let noticeMessage: string = TEXT.searching;

  if (!isStreaming) {
    noticeMessage = TEXT.idleFeedback;
  } else if (poseStatus === "loading") {
    noticeMessage = TEXT.modelLoading;
  } else if (poseStatus === "error") {
    noticeMessage = poseErrorMessage ?? TEXT.modelError;
  } else if (hasPoseLandmarks) {
    noticeMessage = analysis.feedbackMessage || TEXT.detecting;
  }

  const handleEndWorkout = () => {
    stopCamera();
    navigate("/post-workout");
  };

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-[#080A0D]">
      <div
        className="flex w-full max-w-[430px] flex-col px-4 pb-7 pt-3"
        style={{ minHeight: "100dvh", backgroundColor: "#090B0E" }}
      >
        <WorkoutHeader currentCount={analysis.fullRepCount} exercise={DEFAULT_EXERCISE} />

        <main className="mt-4 flex flex-1 flex-col gap-4">
          <CameraStage
            canvasRef={canvasRef}
            cameraErrorMessage={cameraErrorMessage}
            cameraStatus={cameraStatus}
            isStreaming={isStreaming}
            noticeMessage={noticeMessage}
            noticeTitle={TEXT.feedbackTitle}
            onRequestCamera={requestCamera}
            videoRef={videoRef}
          />
        </main>

        <button
          className="mt-5 rounded-[16px] bg-[#3FEED0] py-4 text-[19px] font-extrabold text-[#081B16]"
          onClick={handleEndWorkout}
          type="button"
        >
          {TEXT.finishWorkout}
        </button>
      </div>
    </div>
  );
}
