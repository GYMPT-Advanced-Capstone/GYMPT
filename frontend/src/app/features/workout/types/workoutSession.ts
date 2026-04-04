export type CameraStatus =
  | "ready"
  | "loading"
  | "permission_denied"
  | "no_camera_device"
  | "general_error";

export interface ExerciseInfo {
  id: string;
  name: string;
  emoji?: string;
  iconSrc?: string;
  targetCount: number;
}
