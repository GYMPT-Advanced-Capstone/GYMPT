import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { useGoal } from "../../context/GoalContext";
import { CameraStage } from "./components/CameraStage";
import { WORKOUT_EXERCISES } from "./config/exercises";
import { useCameraPreview } from "./hooks/useCameraPreview";
import { usePushupCalibration } from "./hooks/usePushupCalibration";
import { usePoseLandmarker } from "./hooks/usePoseLandmarker";

function CalibrationCompleteStage() {
  return (
    <section className="rounded-[20px] border border-[#242933] bg-[#15181E] p-[10px]">
      <div className="relative min-h-[420px] overflow-hidden rounded-[16px] bg-[#171A20] md:min-h-[540px]">
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
            초기 범위 설정 완료
          </p>
        </div>
      </div>
    </section>
  );
}

export function RangeCalibrationPage() {
  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { markCalibrated } = useGoal();
  const resolvedExerciseId = exerciseId ?? "squat";
  const exercise = WORKOUT_EXERCISES[resolvedExerciseId] ?? WORKOUT_EXERCISES.squat;
  const isPushup = resolvedExerciseId === "pushup";
  const [isLegacyCalibrationComplete, setIsLegacyCalibrationComplete] = useState(false);
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
    step,
    phase,
    capturedSide,
    calibrationError,
    isSavingCalibration,
    isCalibrationComplete,
    noticeMessage: pushupNoticeMessage,
    onPoseLandmarks,
    startCalibration,
    resetCalibration,
  } = usePushupCalibration({
    enabled: isStreaming && isPushup,
    exerciseId: exercise.backendExerciseId,
    onSuccess: () => {
      markCalibrated(resolvedExerciseId);
      stopCamera();
    },
  });

  const {
    poseStatus,
    poseErrorMessage,
    hasPoseLandmarks,
  } = usePoseLandmarker({
    enabled: isStreaming && !(isPushup ? isCalibrationComplete : isLegacyCalibrationComplete),
    videoRef,
    canvasRef,
    onPoseLandmarks: isPushup ? onPoseLandmarks : undefined,
  });

  const calibrationComplete = isPushup ? isCalibrationComplete : isLegacyCalibrationComplete;

  const isPoseError = poseStatus === "error";
  const isCapturing = step === "top_counting" || step === "bottom_counting";

  let noticeMessage = calibrationError ?? pushupNoticeMessage ?? exercise.calibrationIntro;
  if (isPushup && isStreaming && step !== "idle") {
    noticeMessage = phase === "top" ? exercise.calibrationActiveTop : exercise.calibrationActiveBottom;
  } else if (isStreaming) {
    noticeMessage = exercise.calibrationActiveBottom;
  }
  if (isPoseError) {
    noticeMessage = poseErrorMessage ?? "AI 자세 분석을 시작할 수 없습니다.";
  }
  if (pushupNoticeMessage) {
    noticeMessage = pushupNoticeMessage;
  }
  if (capturedSide) {
    noticeMessage = `${noticeMessage} 현재 ${capturedSide === "left" ? "왼쪽" : "오른쪽"} 측면 기준으로 측정 중입니다.`;
  }

  const handlePrimaryAction = () => {
    if (calibrationComplete) {
      navigate(`/workout/camera/${resolvedExerciseId}`);
      return;
    }
    if (isPoseError) {
      stopCamera();
      void requestCamera();
      return;
    }
    if (!isStreaming) {
      if (isPushup) {
        resetCalibration();
        startCalibration();
      }
      void requestCamera();
      return;
    }
    if (!isPushup) {
      setIsLegacyCalibrationComplete(true);
      markCalibrated(resolvedExerciseId);
      stopCamera();
      return;
    }
    if (step === "idle") {
      startCalibration();
      return;
    }
    if (!hasPoseLandmarks || isCapturing || isSavingCalibration) {
      return;
    }
  };

  const actionLabel = (() => {
    if (calibrationComplete) {
      return "다음";
    }
    if (isSavingCalibration) {
      return "저장 중...";
    }
    if (isPoseError) {
      return "다시 시도";
    }
    if (!isStreaming) {
      return "자세 설정 시작";
    }
    if (isPushup) {
      if (step === "idle") {
        return "자세 설정 시작";
      }
      if (step === "transition_to_bottom") {
        return "다음 단계 안내 중...";
      }
      if (step === "top_waiting" || step === "top_counting") {
        return "탑 자세 자동 측정 중...";
      }
      if (step === "bottom_waiting" || step === "bottom_counting") {
        return "바텀 자세 자동 측정 중...";
      }
    }
    return "측정 중...";
  })();

  const actionDisabled = (
    isSavingCalibration
    || step === "transition_to_bottom"
    || step === "top_waiting"
    || step === "top_counting"
    || step === "bottom_waiting"
    || step === "bottom_counting"
  );

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-[#080A0D]">
      <div
        className="flex w-full max-w-[960px] flex-col px-4 pb-7 pt-3"
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
              alt={exercise.calibrationTitle}
              className="h-8 w-8 object-contain"
              decoding="async"
              height={32}
              src={exercise.iconSrc}
              width={32}
            />
            <h1 className="text-[18px] font-extrabold leading-none text-white">{exercise.calibrationTitle}</h1>
          </div>

          <div className="rounded-full border-2 border-[#39F4D3] bg-[#102C28] px-4 py-[4px]">
            <span className="text-[13px] font-bold text-[#3FFDD4]">
              {isPushup ? `${phase === "top" ? "1" : "2"}/2 단계` : "최초 1회"}
            </span>
          </div>
        </header>

        <main className="mt-4 flex flex-1 flex-col gap-4">
          {calibrationComplete ? (
            <CalibrationCompleteStage />
          ) : (
            <CameraStage
              canvasRef={canvasRef}
              cameraErrorMessage={cameraErrorMessage}
              cameraStatus={cameraStatus}
              isStreaming={isStreaming}
              noticeMessage={noticeMessage}
              noticeTitle="관절 가동 범위 설정"
              onRequestCamera={requestCamera}
              hideStageButton
              idleIntroLine1="카메라 권한을 허용하면"
              idleIntroLine2={isPushup ? "푸쉬업 초기 범위 측정이 시작됩니다." : "스쿼트 가동 범위 분석이 시작됩니다."}
              stageMinHeightClassName="min-h-[420px] md:min-h-[540px]"
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
