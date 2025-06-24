
// Minimal debug version to test if basic rendering works
import React, { useState } from 'react';
import { 
  FileText, 
  FolderOpen, 
  Upload,
  Search,
  Grid3X3,
  User
} from 'lucide-react';

export default function ExcelLandingPage() {
  const [activeCommand, setActiveCommand] = useState('New');

  console.log('🐛 LandingPage component is rendering');
  console.log('🐛 activeCommand:', activeCommand);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Simple sidebar test */}
      <aside className="w-48 bg-green-700 text-white">
        <div className="p-4">
          <h2 className="text-white">TrackSheets</h2>
          <p className="text-sm text-green-200">Debug Mode</p>
        </div>
      </aside>

      {/* Simple main content test */}
      <main className="flex-1 bg-white">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Debug Landing Page
          </h1>
          <p className="text-sm text-gray-600">
            If you see this, basic rendering works
          </p>
        </header>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              🔍 Debug Info
            </h3>
            <p className="text-blue-700 text-sm">
              Active Command: {activeCommand}
            </p>
            <p className="text-blue-700 text-sm">
              Component loaded successfully!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}