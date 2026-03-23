import { createBrowserRouter } from "react-router";

import { LoginPage } from "./features/auth/LoginPage";
import { SignUpPage } from "./features/auth/SignUpPage";
import { FindPasswordPage } from "./features/auth/FindPasswordPage";

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  { path: "/signup", Component: SignUpPage },
  { path: "/find-password", Component: FindPasswordPage },
]);