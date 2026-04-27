/// <reference types="vite/client" />

import { useEffect, useRef, useState } from 'react'

type PoseLandmark = {
  x: number
  y: number
  z: number
  visibility?: number
}

type PoseFeedback = {
  status: string
  message: string
  feedbacks?: string[]
  received_landmarks?: number
  metrics?: {
    visiblePoints?: number
    shoulderTilt?: number
    kneeAlignmentOffset?: number
    hipDepth?: number
  }
}

type PoseDetectionResult = {
  landmarks?: PoseLandmark[][]
}

type PoseLandmarkerInstance = {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => PoseDetectionResult
  close?: () => void
}

type PoseLandmarkerModule = {
  FilesetResolver: {
    forVisionTasks: (basePath: string) => Promise<unknown>
  }
  PoseLandmarker: {
    createFromOptions: (
      vision: unknown,
      options: Record<string, unknown>
    ) => Promise<PoseLandmarkerInstance>
  }
}

const WS_URL =
  import.meta.env.VITE_WORKOUT_WS_URL ||
  import.meta.env.VITE_WS_URL ||
  'ws://localhost:8001/ws/workout-feedback'
const MEDIAPIPE_BUNDLE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
const MEDIAPIPE_WASM_URL = `${MEDIAPIPE_BUNDLE_URL}/wasm`
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

export function MediaPipeTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<PoseLandmarkerInstance | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastSentAtRef = useRef<number>(0)

  const [connectionState, setConnectionState] = useState('연결 중...')
  const [cameraState, setCameraState] = useState('카메라 준비 중...')
  const [feedback, setFeedback] = useState<PoseFeedback | null>(null)
  const [lastSentCount, setLastSentCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function setup() {
      try {
        const video = videoRef.current
        if (!video) {
          return
        }

        const websocket = new WebSocket(WS_URL)
        websocketRef.current = websocket

        websocket.onopen = () => {
          if (!cancelled) {
            setConnectionState('백엔드 웹소켓 연결됨')
          }
        }

        websocket.onmessage = (event) => {
          if (cancelled) {
            return
          }

          const nextFeedback = JSON.parse(event.data) as PoseFeedback
          setFeedback(nextFeedback)
        }

        websocket.onerror = () => {
          if (!cancelled) {
            setConnectionState('웹소켓 오류')
          }
        }

        websocket.onclose = (event) => {
          if (!cancelled) {
            setConnectionState(`웹소켓 연결 종료 (code: ${event.code}${event.reason ? `, reason: ${event.reason}` : ''})`)
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 960, height: 540 },
          audio: false,
        })

        streamRef.current = stream
        video.srcObject = stream
        await video.play()
        if (!cancelled) {
          setCameraState('카메라 연결됨')
        }

        const visionModule = (await import(
          /* @vite-ignore */ MEDIAPIPE_BUNDLE_URL
        )) as PoseLandmarkerModule
        const vision = await visionModule.FilesetResolver.forVisionTasks(
          MEDIAPIPE_WASM_URL
        )

        if (cancelled) {
          return
        }

        landmarkerRef.current = await visionModule.PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: POSE_MODEL_URL,
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          }
        )

        const renderFrame = () => {
          const currentVideo = videoRef.current
          const currentCanvas = canvasRef.current
          const landmarker = landmarkerRef.current

          if (!currentVideo || !currentCanvas || !landmarker) {
            animationFrameRef.current = requestAnimationFrame(renderFrame)
            return
          }

          const context = currentCanvas.getContext('2d')
          if (!context) {
            animationFrameRef.current = requestAnimationFrame(renderFrame)
            return
          }

          currentCanvas.width = currentVideo.videoWidth
          currentCanvas.height = currentVideo.videoHeight
          context.clearRect(0, 0, currentCanvas.width, currentCanvas.height)

          if (currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const result = landmarker.detectForVideo(currentVideo, performance.now())
            const landmarks = result.landmarks?.[0] ?? []

            if (landmarks.length > 0) {
              context.fillStyle = '#00ffb2'
              landmarks.forEach((landmark) => {
                context.beginPath()
                context.arc(
                  landmark.x * currentCanvas.width,
                  landmark.y * currentCanvas.height,
                  4,
                  0,
                  Math.PI * 2
                )
                context.fill()
              })

              const now = performance.now()
              if (
                websocketRef.current?.readyState === WebSocket.OPEN &&
                now - lastSentAtRef.current > 250
              ) {
                websocketRef.current.send(
                  JSON.stringify({
                    type: 'pose_frame',
                    landmarks,
                    timestamp: Date.now(),
                  })
                )
                lastSentAtRef.current = now
                setLastSentCount(landmarks.length)
              }
            }
          }

          animationFrameRef.current = requestAnimationFrame(renderFrame)
        }

        animationFrameRef.current = requestAnimationFrame(renderFrame)
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'MediaPipe 초기화에 실패했습니다.'
          setErrorMessage(message)
          setCameraState('카메라 또는 MediaPipe 초기화 실패')
        }
      }
    }

    void setup()

    return () => {
      cancelled = true

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())
      websocketRef.current?.close()
      landmarkerRef.current?.close?.()
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-6 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">MediaPipe Pose WebSocket Test</h1>
          <p className="mt-2 text-sm text-white/70">
            `/mediapipe/test`에서 웹캠 포즈 좌표를 추출하고 백엔드에 바로 전송합니다.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-white/50">웹소켓 상태</div>
                <div className="mt-1 font-medium">{connectionState}</div>
              </div>

              <div>
                <div className="text-white/50">카메라 상태</div>
                <div className="mt-1 font-medium">{cameraState}</div>
              </div>

              <div>
                <div className="text-white/50">최근 전송 랜드마크 수</div>
                <div className="mt-1 font-medium">{lastSentCount}</div>
              </div>

              <div>
                <div className="text-white/50">즉시 피드백</div>
                <div className="mt-1 rounded-2xl bg-emerald-400/10 p-4 text-emerald-200">
                  {feedback?.message || '피드백 대기 중'}
                </div>
              </div>

              <div>
                <div className="text-white/50">세부 피드백</div>
                <ul className="mt-2 space-y-2">
                  {(feedback?.feedbacks || []).map((item) => (
                    <li key={item} className="rounded-xl bg-white/5 px-3 py-2 text-white/80">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-white/50">측정값</div>
                <pre className="mt-2 overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-white/80">
                  {JSON.stringify(feedback?.metrics || {}, null, 2)}
                </pre>
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
