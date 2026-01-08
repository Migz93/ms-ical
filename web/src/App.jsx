import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, Settings } from 'lucide-react';
import CalendarView from './pages/CalendarView';
import SettingsPage from './pages/SettingsPage';

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-background-paper shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-100">
                  MS iCal
                </h1>
              </div>
              <div className="ml-6 flex space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location.pathname === '/'
                      ? 'border-primary text-gray-100'
                      : 'border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-200'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Calendar
                </Link>
                <Link
                  to="/settings"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location.pathname === '/settings'
                      ? 'border-primary text-gray-100'
                      : 'border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-200'
                  }`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<CalendarView />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
