import { createBrowserRouter } from "react-router";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import UploadPage from "./pages/UploadPage";
import ResultPage from "./pages/ResultPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/home",
    Component: HomePage,
  },
  {
    path: "/upload",
    Component: UploadPage,
  },
  {
    path: "/result",
    Component: ResultPage,
  },
]);
