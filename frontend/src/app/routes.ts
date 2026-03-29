import { createBrowserRouter } from "react-router";

import { LoginPage } from "./features/auth/LoginPage";
import { SignUpPage } from "./features/auth/SignUpPage";
import { FindPasswordPage } from "./features/auth/FindPasswordPage";

import { GoalBirthdayPage } from "./features/onboarding/GoalBirthdayPage";
import { GoalWeeklyPage } from "./features/onboarding/GoalWeeklyPage";
import { GoalExercisePage } from "./features/onboarding/GoalExercisePage";
import { GoalExerciseAllPage } from "./features/onboarding/GoalExerciseAllPage";
import { GoalReadyPage } from "./features/onboarding/GoalReadyPage";

import { MainPage } from "./features/workout/MainPage";

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
]);