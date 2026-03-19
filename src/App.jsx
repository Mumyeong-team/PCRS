import "./styles.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Capture from "./pages/Capture";
import Services from "./pages/Services";
import Style from "./pages/Style";
import Fit3D from "./pages/Fit3D";
import Compose from "./pages/Compose";
import { AppProvider } from "./context/AppContext";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/services" element={<Services />} />
          <Route path="/style" element={<Style />} />
          <Route path="/fit3d" element={<Fit3D />} />
          <Route path="/compose" element={<Compose />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
