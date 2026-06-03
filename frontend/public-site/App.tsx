import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { BookingPage } from "./pages/BookingPage";
import { ServiceAreaPage } from "./pages/ServiceAreaPage";
import { TrackingPage } from "./pages/TrackingPage";
import { PortalPage } from "./pages/PortalPage";
import { AboutPage } from "./pages/AboutPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="book" element={<BookingPage />} />
          <Route path="service-area" element={<ServiceAreaPage />} />
          <Route path="track" element={<TrackingPage />} />
          <Route path="portal" element={<PortalPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
