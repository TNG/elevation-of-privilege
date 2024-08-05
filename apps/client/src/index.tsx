import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './pages/app';
import Create from './pages/create';
import About from './pages/about';

import 'bootstrap/dist/css/bootstrap.min.css';

const container = document.getElementById('root');
const root = createRoot(container!);

const router = createBrowserRouter([
  { path: '/:matchID/:playerID/:credentials', element: <App /> },
  { path: '/', element: <Create /> },
  { path: '/about', element: <About /> },
]);

root.render(<RouterProvider router={router} />);
