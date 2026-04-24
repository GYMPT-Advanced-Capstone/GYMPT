import { Camera, LoaderCircle, RefreshCw, TriangleAlert, VideoOff } from "lucide-react";
import type { RefObject } from "react";

import type { CameraStatus } from "../types/workoutSession";

interface CameraStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  cameraErrorMessage: string | null;
  isStreaming: boolean;
  noticeTitle: string;
  noticeMessage: string;
  onRequestCamera: () => Promise<void>;
  hideStageButton?: boolean;
  idleIntroLine1?: string;
  idleIntroLine2?: string;
  stageMinHeightClassName?: string;
}

const TEXT = {
  loading: "\uce74\uba54\ub77c\ub97c \uc5f0\uacb0\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4...",
  denied: "\uce74\uba54\ub77c \uad8c\ud55c\uc774 \uac70\ubd80\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
  noDevice: "\uce74\uba54\ub77c \uc7a5\uce58\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
  generalError: "\uce74\uba54\ub77c \uc5f0\uacb0 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.",
  intro1: "\uce74\uba54\ub77c \uad8c\ud55c\uc744 \ud5c8\uc6a9\ud558\uba74",
  intro2: "\uc2e4\uc2dc\uac04 \uc790\uc138 \ubd84\uc11d\uc774 \uc2dc\uc791\ub429\ub2c8\ub2e4",
  buttonLoading: "\uce74\uba54\ub77c \uc5f0\uacb0 \uc911...",
  buttonStart: "\uce74\uba54\ub77c \uc2dc\uc791",
  buttonRetry: "\ub2e4\uc2dc \uc2dc\ub3c4",
} as const;

function StageMessage({
  cameraStatus,
  cameraErrorMessage,
  idleIntroLine1,
  idleIntroLine2,
}: Pick<CameraStageProps, "cameraStatus" | "cameraErrorMessage" | "idleIntroLine1" | "idleIntroLine2">) {
  if (cameraStatus === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <LoaderCircle className="animate-spin text-[#3FFDD4]" size={34} />
        <p className="text-[15px] font-medium text-[#D4D8DB]">{TEXT.loading}</p>
      </div>
    );
  }

  if (cameraStatus === "permission_denied") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <TriangleAlert className="text-[#FF8A80]" size={32} />
        <p className="text-[15px] font-medium text-[#D4D8DB]">{TEXT.denied}</p>
        {cameraErrorMessage && <p className="text-[13px] text-[#8F959B]">{cameraErrorMessage}</p>}
      </div>
    );
  }

  if (cameraStatus === "no_camera_device") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <VideoOff className="text-[#FFB74D]" size={32} />
        <p className="text-[15px] font-medium text-[#D4D8DB]">{TEXT.noDevice}</p>
        {cameraErrorMessage && <p className="text-[13px] text-[#8F959B]">{cameraErrorMessage}</p>}
      </div>
    );
  }

  if (cameraStatus === "general_error") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <TriangleAlert className="text-[#FF8A80]" size={32} />
        <p className="text-[15px] font-medium text-[#D4D8DB]">{TEXT.generalError}</p>
        {cameraErrorMessage && <p className="text-[13px] text-[#8F959B]">{cameraErrorMessage}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border-[3px] border-dashed border-[#3FFDD4]">
        <Camera className="text-[#3FFDD4]" size={34} />
      </div>
      <p className="text-[15px] font-semibold text-[#656A73]">{idleIntroLine1 ?? TEXT.intro1}</p>
      <p className="text-[15px] font-semibold text-[#656A73]">{idleIntroLine2 ?? TEXT.intro2}</p>
    </div>
  );
}

export function CameraStage({
  canvasRef,
  videoRef,
  cameraStatus,
  cameraErrorMessage,
  isStreaming,
  noticeTitle,
  noticeMessage,
  onRequestCamera,
  hideStageButton = false,
  idleIntroLine1,
  idleIntroLine2,
  stageMinHeightClassName = "min-h-[700px]",
}: CameraStageProps) {
  const requestButtonLabel =
    cameraStatus === "loading"
      ? TEXT.buttonLoading
      : cameraStatus === "ready"
        ? TEXT.buttonStart
        : TEXT.buttonRetry;

  return (
    <section className="rounded-[20px] border border-[#242933] bg-[#15181E] p-[10px]">
      <div className={`relative overflow-hidden rounded-[16px] bg-[#171A20] ${stageMinHeightClassName}`}>
        <video
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isStreaming ? "opacity-100" : "opacity-20"
          }`}
          muted
          playsInline
          ref={videoRef}
        />
        <canvas
          className={`pointer-events-none absolute inset-0 z-[5] h-full w-full transition-opacity duration-300 ${
            isStreaming ? "opacity-100" : "opacity-0"
          }`}
          ref={canvasRef}
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-5 top-5 h-7 w-7 border-l-[4px] border-t-[4px] border-[#3FFDD4]" />
          <div className="absolute right-5 top-5 h-7 w-7 border-r-[4px] border-t-[4px] border-[#3FFDD4]" />
          <div className="absolute bottom-5 left-5 h-7 w-7 border-b-[4px] border-l-[4px] border-[#3FFDD4]" />
          <div className="absolute bottom-5 right-5 h-7 w-7 border-b-[4px] border-r-[4px] border-[#3FFDD4]" />
        </div>

        {isStreaming && (
          <div className="pointer-events-none absolute inset-5 rounded-[16px] border border-dashed border-[#3FFDD455]">
            {/* Integration boundary: future MediaPipe landmarks/canvas overlay goes here. */}
          </div>
        )}

        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6">
            <StageMessage
              cameraErrorMessage={cameraErrorMessage}
              cameraStatus={cameraStatus}
              idleIntroLine1={idleIntroLine1}
              idleIntroLine2={idleIntroLine2}
            />
            {!hideStageButton && (
              <button
                className="flex min-w-[138px] items-center justify-center gap-2 rounded-[14px] bg-[#3FEED0] px-7 py-[13px] text-[18px] font-extrabold text-[#071A16] disabled:cursor-not-allowed disabled:bg-[#2A4A43] disabled:text-[#9CC7BE]"
                disabled={cameraStatus === "loading"}
                onClick={() => {
                  void onRequestCamera();
                }}
                type="button"
              >
                {cameraStatus !== "ready" && cameraStatus !== "loading" && <RefreshCw size={16} />}
                {requestButtonLabel}
              </button>
            )}
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 rounded-[14px] border border-[#2A3038] bg-[#171C23EE] px-4 py-3 backdrop-blur-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#3FEED0]" />
            <p className="text-[12px] font-bold text-[#3FEED0]">{noticeTitle}</p>
          </div>
          <p className="text-[14px] font-semibold leading-6 text-[#D0D5DD]">
            {noticeMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
