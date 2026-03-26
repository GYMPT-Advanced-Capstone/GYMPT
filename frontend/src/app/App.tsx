import { RouterProvider } from 'react-router';
import { router } from './routes';
import { GoalProvider } from './context/GoalContext';

export default function App() {
  return (
    <GoalProvider>
      <RouterProvider router={router} />
    </GoalProvider>
  );
}
