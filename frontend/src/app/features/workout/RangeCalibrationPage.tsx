import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRef } from "react";
import { useNavigate, useParams } from "react-router";

import { useGoal } from "../../context/GoalContext";
import { CameraStage } from "./components/CameraStage";
import { WORKOUT_EXERCISES } from "./config/exercises";
import { useCameraPreview } from "./hooks/useCameraPreview";
import { usePoseLandmarker } from "./hooks/usePoseLandmarker";
import { usePushupCalibration } from "./hooks/usePushupCalibration";
import { useSquatCalibration } from "./hooks/useSquatCalibration";

function CalibrationCompleteStage({ isPushup }: { isPushup: boolean }) {
  return (
    <section className="rounded-[20px] border border-[#242933] bg-[#15181E] p-[10px]">
      <div
        className={`relative overflow-hidden rounded-[16px] bg-[#171A20] ${
          isPushup ? "min-h-[420px] md:min-h-[540px]" : "min-h-[calc(100dvh-112px)] md:min-h-[900px]"
        }`}
      >
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
          <p className="text-[28px] font-extrabold text-[#3FFDD4]">
            기준 범위 설정 완료
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
    step: pushupStep,
    phase: pushupPhase,
    capturedSide: pushupCapturedSide,
    calibrationError: pushupCalibrationError,
    isSavingCalibration: isSavingPushupCalibration,
    isCalibrationComplete: isPushupCalibrationComplete,
    noticeMessage: pushupNoticeMessage,
    onPoseLandmarks: onPushupPoseLandmarks,
    startCalibration: startPushupCalibration,
    resetCalibration: resetPushupCalibration,
  } = usePushupCalibration({
    enabled: isStreaming && isPushup,
    exerciseId: exercise.backendExerciseId,
    onSuccess: () => {
      markCalibrated(resolvedExerciseId);
      stopCamera();
    },
  });

  const {
    step: squatStep,
    phase: squatPhase,
    capturedSide: squatCapturedSide,
    calibrationError: squatCalibrationError,
    isSavingCalibration: isSavingSquatCalibration,
    isCalibrationComplete: isSquatCalibrationComplete,
    noticeMessage: squatNoticeMessage,
    onPoseLandmarks: onSquatPoseLandmarks,
    startCalibration: startSquatCalibration,
    resetCalibration: resetSquatCalibration,
  } = useSquatCalibration({
    enabled: isStreaming && !isPushup,
    exerciseId: exercise.backendExerciseId,
    onSuccess: () => {
      markCalibrated(resolvedExerciseId);
      stopCamera();
    },
  });

  const activeStep = isPushup ? pushupStep : squatStep;
  const activePhase = isPushup ? pushupPhase : squatPhase;
  const activeCapturedSide = isPushup ? pushupCapturedSide : squatCapturedSide;
  const calibrationError = isPushup ? pushupCalibrationError : squatCalibrationError;
  const isSavingCalibration = isPushup ? isSavingPushupCalibration : isSavingSquatCalibration;
  const calibrationComplete = isPushup ? isPushupCalibrationComplete : isSquatCalibrationComplete;
  const activeNoticeMessage = isPushup ? pushupNoticeMessage : squatNoticeMessage;

  const {
    poseStatus,
    poseErrorMessage,
    hasPoseLandmarks,
  } = usePoseLandmarker({
    enabled: isStreaming && !calibrationComplete,
    videoRef,
    canvasRef,
    onPoseLandmarks: isPushup ? onPushupPoseLandmarks : onSquatPoseLandmarks,
  });

  const isPoseError = poseStatus === "error";
  const isCapturing = activeStep === "top_counting" || activeStep === "bottom_counting";

  let noticeMessage = exercise.calibrationIntro;
  if (activeNoticeMessage) {
    noticeMessage = activeNoticeMessage;
  } else if (isStreaming && activeStep !== "idle") {
    noticeMessage = activePhase === "top" ? exercise.calibrationActiveTop : exercise.calibrationActiveBottom;
  } else if (isStreaming) {
    noticeMessage = exercise.calibrationActiveBottom;
  }
  if (calibrationError) {
    noticeMessage = calibrationError;
  }
  if (isPoseError) {
    noticeMessage = poseErrorMessage ?? "AI 자세 분석을 시작할 수 없습니다.";
  }
  if (activeCapturedSide) {
    noticeMessage = `${noticeMessage} 현재 ${activeCapturedSide === "left" ? "왼쪽" : "오른쪽"} 측면 기준으로 측정 중입니다.`;
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
        resetPushupCalibration();
        startPushupCalibration();
      } else {
        resetSquatCalibration();
        startSquatCalibration();
      }
      void requestCamera();
      return;
    }
    if (activeStep === "idle") {
      if (isPushup) {
        startPushupCalibration();
      } else {
        startSquatCalibration();
      }
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
    if (!isStreaming || activeStep === "idle") {
      return isPushup ? "자세 설정 시작" : "스쿼트 기준 측정 시작";
    }
    if (activeStep === "transition_to_bottom") {
      return "다음 단계 안내 중...";
    }
    if (activeStep === "top_waiting" || activeStep === "top_counting") {
      return isPushup ? "탑 자세 자동 측정 중..." : "선 자세 자동 측정 중...";
    }
    if (activeStep === "bottom_waiting" || activeStep === "bottom_counting") {
      return isPushup ? "바텀 자세 자동 측정 중..." : "앉은 자세 자동 측정 중...";
    }
    return "측정 중...";
  })();

  const actionDisabled = (
    isSavingCalibration
    || activeStep === "transition_to_bottom"
    || activeStep === "top_waiting"
    || activeStep === "top_counting"
    || activeStep === "bottom_waiting"
    || activeStep === "bottom_counting"
  );

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-[#080A0D]">
      <div
        className={`flex w-full max-w-[960px] flex-col px-4 ${isPushup ? "pb-7 pt-3" : "pb-4 pt-2"}`}
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
              {`${activePhase === "top" ? "1" : "2"}/2 단계`}
            </span>
          </div>
        </header>

        <main className={`${isPushup ? "mt-4" : "mt-2"} flex flex-1 flex-col gap-4`}>
          {calibrationComplete ? (
            <CalibrationCompleteStage isPushup={isPushup} />
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
              idleIntroLine2={isPushup ? "푸쉬업 초기 범위 측정이 시작됩니다" : "스쿼트 기준 범위 측정이 시작됩니다"}
              stageMinHeightClassName={isPushup ? "min-h-[420px] md:min-h-[540px]" : "min-h-[calc(100dvh-112px)] md:min-h-[900px]"}
              videoRef={videoRef}
            />
          )}
        </main>

        <button
          className={`${isPushup ? "mt-5" : "mt-2"} rounded-[16px] bg-[#3FEED0] py-4 text-[19px] font-extrabold text-[#081B16] disabled:cursor-not-allowed disabled:bg-[#2A4A43] disabled:text-[#9CC7BE]`}
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
