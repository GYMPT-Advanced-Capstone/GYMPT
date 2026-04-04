import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { useGoal } from "../../context/GoalContext";
import squatImg from "../../../assets/exercises/squat.png";
import { CameraStage } from "./components/CameraStage";
import { useCameraPreview } from "./hooks/useCameraPreview";
import { usePoseLandmarker } from "./hooks/usePoseLandmarker";

const TEXT = {
  title: "스쿼트 범위 설정",
  minimum: "최초 1회",
  noticeTitle: "관절 가동 범위 설정",
  noticeGuide: "본인의 관절 최대 가동 범위를 설정하는 단계입니다.",
  activeGuide: "고통을 느끼지 전까지 무릎을 최대한 굽혀주세요.",
  modelError: "AI 자세 분석을 시작할 수 없습니다.",
  completeTitle: "가동 범위 설정 완료!",
  start: "자세 설정 시작",
  detect: "자세 인식 중...",
  finish: "가동 범위 설정 완료",
  next: "다음",
} as const;

function CalibrationCompleteStage() {
  return (
    <section className="rounded-[20px] border border-[#242933] bg-[#15181E] p-[10px]">
      <div className="relative min-h-[700px] overflow-hidden rounded-[16px] bg-[#171A20]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-5 top-5 h-7 w-7 border-l-[4px] border-t-[4px] border-[#3FFDD4]" />
          <div className="absolute right-5 top-5 h-7 w-7 border-r-[4px] border-t-[4px] border-[#3FFDD4]" />
          <div className="absolute bottom-5 left-5 h-7 w-7 border-b-[4px] border-l-[4px] border-[#3FFDD4]" />
          <div className="absolute bottom-5 right-5 h-7 w-7 border-b-[4px] border-r-[4px] border-[#3FFDD4]" />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#173A34]">
            <CheckCircle2 className="text-[#3FFDD4]" size={62} strokeWidth={2.2} />
          </div>
          <p className="text-[28px] font-extrabold tracking-[-0.2px] text-[#3FFDD4]">
            {TEXT.completeTitle}
          </p>
        </div>
      </div>
    </section>
  );
}

function resolveActionLabel(params: {
  isCalibrationComplete: boolean;
  isStreaming: boolean;
  canCompleteCalibration: boolean;
}): string {
  const { isCalibrationComplete, isStreaming, canCompleteCalibration } = params;
  if (isCalibrationComplete) {
    return TEXT.next;
  }
  if (!isStreaming) {
    return TEXT.start;
  }
  if (canCompleteCalibration) {
    return TEXT.finish;
  }
  return TEXT.detect;
}

export function RangeCalibrationPage() {
  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { markCalibrated } = useGoal();
  const [isCalibrationComplete, setIsCalibrationComplete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    cameraStatus,
    cameraErrorMessage,
    isStreaming,
    requestCamera,
    stopCamera,
  } = useCameraPreview(videoRef);

  const {
    poseStatus,
    poseErrorMessage,
    hasPoseLandmarks,
  } = usePoseLandmarker({
    enabled: isStreaming && !isCalibrationComplete,
    videoRef,
    canvasRef,
  });

  const resolvedExerciseId = exerciseId ?? "squat";

  let noticeMessage: string = TEXT.noticeGuide;
  if (isStreaming) {
    noticeMessage = TEXT.activeGuide;
  }
  if (poseStatus === "error") {
    noticeMessage = poseErrorMessage ?? TEXT.modelError;
  }

  const handlePrimaryAction = () => {
    if (isCalibrationComplete) {
      markCalibrated(resolvedExerciseId);
      navigate("/workout/camera");
      return;
    }

    if (!isStreaming) {
      void requestCamera();
      return;
    }

    setIsCalibrationComplete(true);
    stopCamera();
  };

  const canCompleteCalibration = isStreaming && hasPoseLandmarks;
  const actionLabel = resolveActionLabel({
    isCalibrationComplete,
    isStreaming,
    canCompleteCalibration,
  });
  const actionDisabled = !isCalibrationComplete && isStreaming && !canCompleteCalibration;

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-[#080A0D]">
      <div
        className="flex w-full max-w-[430px] flex-col px-4 pb-7 pt-3"
        style={{ minHeight: "100dvh", backgroundColor: "#090B0E" }}
      >
        <header className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="뒤로 가기"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-white/90"
              onClick={() => navigate(-1)}
              type="button"
            >
              <ArrowLeft size={23} />
            </button>
            <img
              alt={TEXT.title}
              className="h-8 w-8 object-contain"
              decoding="async"
              height={32}
              src={squatImg}
              width={32}
            />
            <h1 className="text-[18px] font-extrabold leading-none text-white">{TEXT.title}</h1>
          </div>

          <div className="rounded-full border-2 border-[#39F4D3] bg-[#102C28] px-4 py-[4px]">
            <span className="text-[13px] font-bold text-[#3FFDD4]">{TEXT.minimum}</span>
          </div>
        </header>

        <main className="mt-4 flex flex-1 flex-col gap-4">
          {isCalibrationComplete ? (
            <CalibrationCompleteStage />
          ) : (
            <CameraStage
              canvasRef={canvasRef}
              cameraErrorMessage={cameraErrorMessage}
              cameraStatus={cameraStatus}
              isStreaming={isStreaming}
              noticeMessage={noticeMessage}
              noticeTitle={TEXT.noticeTitle}
              onRequestCamera={requestCamera}
              hideStageButton
              idleIntroLine1="카메라 권한을 허용하면"
              idleIntroLine2="스쿼트 가동 범위 분석이 시작됩니다."
              videoRef={videoRef}
            />
          )}
        </main>

        <button
          className="mt-5 rounded-[16px] bg-[#3FEED0] py-4 text-[19px] font-extrabold text-[#081B16] disabled:cursor-not-allowed disabled:bg-[#2A4A43] disabled:text-[#9CC7BE]"
          disabled={actionDisabled}
          onClick={handlePrimaryAction}
          type="button"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
