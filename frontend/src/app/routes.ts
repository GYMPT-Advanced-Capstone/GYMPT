import { createBrowserRouter } from "react-router";

import { LoginPage } from "./features/auth/LoginPage";
import { SignUpPage } from "./features/auth/SignUpPage";
import { FindPasswordPage } from "./features/auth/FindPasswordPage";
import { CameraAnalysisPage } from "./features/workout/CameraAnalysisPage";
import { RangeCalibrationPage } from "./features/workout/RangeCalibrationPage";

import { GoalBirthdayPage } from "./features/onboarding/GoalBirthdayPage";
import { GoalWeeklyPage } from "./features/onboarding/GoalWeeklyPage";
import { GoalExercisePage } from "./features/onboarding/GoalExercisePage";
import { GoalExerciseAllPage } from "./features/onboarding/GoalExerciseAllPage";
import { GoalReadyPage } from "./features/onboarding/GoalReadyPage";

import { MainPage } from "./features/workout/MainPage";

import { MyPage } from "./features/profile/MyPage";

import { PostWorkout } from "./features/workout/PostWorkout";
import { Community } from "./features/community/Community";
import { CreatePost } from "./features/community/CreatePost";

import { AnalysisPage } from "./features/analysis/AnalysisPage";


export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  { path: "/signup", Component: SignUpPage },
  { path: "/find-password", Component: FindPasswordPage },

  { path: "/goal/birthday", Component: GoalBirthdayPage },
  { path: "/goal/weekly", Component: GoalWeeklyPage },
  { path: "/goal/exercise/:exerciseId", Component: GoalExercisePage },
  { path: "/goal/exercises", Component: GoalExerciseAllPage },
  { path: "/goal/ready", Component: GoalReadyPage },

  { path: "/main", Component: MainPage },
  { path: "/workout/calibration/:exerciseId", Component: RangeCalibrationPage },
  { path: "/workout/camera/:exerciseId", Component: CameraAnalysisPage },
  { path: "/post-workout", Component: PostWorkout },
  { path: "/community", Component: Community },
  { path: "/create-post", Component: CreatePost },
  { path: "/analysis", Component: AnalysisPage },

  { path: "/mypage", Component: MyPage },
]);
