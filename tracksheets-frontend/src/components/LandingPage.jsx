// src/components/LandingPage.jsx
import React, { useState } from 'react';
import { 
  FileText, 
  FolderOpen, 
  Search, 
  Save, 
  Printer, 
  Share, 
  Download,
  X,
  Grid3X3,
  BarChart3,
  PieChart,
  Calendar,
  User,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  ClipboardList
} from 'lucide-react';

export default function LandingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCommand, setActiveCommand] = useState('New');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [workbookName, setWorkbookName] = useState('');
  const [showMainApp, setShowMainApp] = useState(false);

  const templates = [
    { 
      name: 'Blank workbook', 
      icon: Grid3X3, 
      description: 'Start with a clean slate',
      category: 'General',
      preview: 'bg-white border-2 border-gray-300'
    },
    { 
      name: 'Personal Monthly Budget', 
      icon: Calculator, 
      description: 'Track your personal expenses and income',
      category: 'Budget',
      preview: 'bg-green-50 border-2 border-green-200'
    },
    { 
      name: 'Sales Report', 
      icon: TrendingUp, 
      description: 'Analyze sales performance and trends',
      category: 'Business',
      preview: 'bg-blue-50 border-2 border-blue-200'
    },
    { 
      name: 'Project Timeline', 
      icon: Calendar, 
      description: 'Plan and track project milestones',
      category: 'Project',
      preview: 'bg-purple-50 border-2 border-purple-200'
    },
    { 
      name: 'Expense Tracker', 
      icon: PieChart, 
      description: 'Monitor spending by category',
      category: 'Budget',
      preview: 'bg-yellow-50 border-2 border-yellow-200'
    },
    { 
      name: 'Customer Database', 
      icon: FileSpreadsheet, 
      description: 'Manage customer information and data',
      category: 'Business',
      preview: 'bg-red-50 border-2 border-red-200'
    },
    { 
      name: 'Inventory List', 
      icon: ClipboardList, 
      description: 'Track products and stock levels',
      category: 'Business',
      preview: 'bg-indigo-50 border-2 border-indigo-200'
    },
    { 
      name: 'Task Planner', 
      icon: FileText, 
      description: 'Organize tasks and deadlines',
      category: 'Planning',
      preview: 'bg-teal-50 border-2 border-teal-200'
    }
  ];

  const sidebarItems = [
    { name: 'New', icon: FileText, action: 'new' },
    { name: 'Open', icon: FolderOpen, action: 'open' },
    { name: 'Save', icon: Save, action: 'save' },
    { name: 'Save As', icon: Save, action: 'saveAs' },
    { name: 'Print', icon: Printer, action: 'print' },
    { name: 'Share', icon: Share, action: 'share' },
    { name: 'Export', icon: Download, action: 'export' },
    { name: 'Close', icon: X, action: 'close' }
  ];

  // Handle sidebar command clicks
  const handleSidebarClick = async (command) => {
    setActiveCommand(command.name);
    
    switch (command.action) {
      case 'new':
        // Show New template selection (already visible)
        break;
      case 'open':
        await handleOpenFile();
        break;
      case 'save':
        await handleSaveFile();
        break;
      case 'saveAs':
        await handleSaveAsFile();
        break;
      case 'print':
        await handlePrintFile();
        break;
      case 'share':
        await handleShareFile();
        break;
      case 'export':
        await handleExportFile();
        break;
      case 'close':
        await handleCloseFile();
        break;
      default:
        console.log(`Command ${command.name} clicked`);
    }
  };

  // Handle template selection
  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    setWorkbookName(`${template.name} - ${new Date().toLocaleDateString()}`);
    setShowNameDialog(true);
  };

  // Handle workbook creation
  const handleCreateWorkbook = async () => {
    if (!workbookName.trim()) {
      alert('Please enter a workbook name');
      return;
    }

    try {
      // Call Python backend to create workbook
      const response = await fetch('http://127.0.0.1:5000/api/workbook/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workbookName,
          template: selectedTemplate.name,
          category: selectedTemplate.category
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Workbook created:', result);
        
        // Close dialog and open main app
        setShowNameDialog(false);
        setShowMainApp(true);
      } else {
        throw new Error('Failed to create workbook');
      }
    } catch (error) {
      console.error('Error creating workbook:', error);
      
      // For now, simulate success for demo purposes
      console.log('Creating workbook locally:', {
        name: workbookName,
        template: selectedTemplate.name,
        category: selectedTemplate.category
      });
      
      setShowNameDialog(false);
      setShowMainApp(true);
    }
  };

  // Python backend integration functions
  const handleOpenFile = async () => {
    console.log('🗂️ Opening file browser...');
    alert('Open File - Python integration ready!');
  };

  const handleSaveFile = async () => {
    console.log('💾 Saving current file...');
    alert('Save - Python integration ready!');
  };

  const handleSaveAsFile = async () => {
    console.log('📁 Save As dialog...');
    alert('Save As - Python integration ready!');
  };

  const handlePrintFile = async () => {
    console.log('🖨️ Print dialog...');
    alert('Print - Python integration ready!');
  };

  const handleShareFile = async () => {
    console.log('🔗 Share dialog...');
    alert('Share - Python integration ready!');
  };

  const handleExportFile = async () => {
    console.log('📤 Export dialog...');
    alert('Export - Python integration ready!');
  };

  const handleCloseFile = async () => {
    console.log('❌ Closing application...');
    alert('Close - Python integration ready!');
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If main app should be shown, render it instead
  if (showMainApp) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">TrackSheets Main Application</h1>
          <p className="text-gray-600 mb-4">
            Workbook "{workbookName}" created successfully!
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Template: {selectedTemplate?.name} | Category: {selectedTemplate?.category}
          </p>
          
          {/* Placeholder for Main App */}
          <div className="bg-white border border-gray-300 rounded-lg p-8 max-w-4xl mx-auto">
            <p className="text-gray-600">
              🚀 <strong>Integration Point:</strong> This is where the "TrackSheets Main Application" 
              component from your Project Knowledge will be loaded.
            </p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Next Steps:</strong><br/>
                1. Import the TrackSheetsApp component from Project Knowledge<br/>
                2. Pass workbook data as props<br/>
                3. Connect to Python backend for data persistence
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowMainApp(false)}
            className="mt-6 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            ← Back to Landing Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Green Sidebar */}
      <aside className="w-48 bg-green-700 text-white">
        <div className="p-4 border-b border-green-600">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <Grid3X3 className="w-4 h-4 text-green-700" />
            </div>
            <span className="font-semibold text-sm">TrackSheets</span>
          </div>
        </div>
        
        <nav className="p-2">
          <ul className="space-y-1">
            {sidebarItems.map((item, index) => (
              <li key={index}>
                <button 
                  onClick={() => handleSidebarClick(item)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left text-sm rounded transition-colors ${
                    activeCommand === item.name
                      ? 'bg-green-600 text-white' 
                      : 'text-green-100 hover:bg-green-600 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">New</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </header>

        {/* Search and Templates */}
        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search for online templates"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Suggested Searches */}
          <div className="mb-6">
            <span className="text-sm text-gray-600 mr-4">Suggested searches:</span>
            <div className="inline-flex flex-wrap gap-2 mt-2">
              {['Budget', 'Invoice', 'Calendar', 'Expense', 'List', 'Loan'].map((term, index) => (
                <button
                  key={index}
                  onClick={() => setSearchTerm(term)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid - 3 across in square boxes */}
          <div className="grid grid-cols-3 gap-4 max-w-4xl">
            {filteredTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => handleTemplateClick(template)}
                className="group bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-green-300 transition-all duration-200 p-3 text-left aspect-square flex flex-col"
              >
                {/* Template Preview - Square */}
                <div className={`w-full flex-1 ${template.preview} rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                  <template.icon className="w-6 h-6 text-gray-500" />
                </div>
                
                {/* Template Info - Compact */}
                <div className="flex-shrink-0">
                  <h3 className="font-medium text-gray-900 group-hover:text-green-700 text-xs mb-1 line-clamp-2">
                    {template.name}
                  </h3>
                  <span className="inline-block px-1 py-0.5 text-xs bg-gray-100 text-gray-600 rounded text-xs">
                    {template.category}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* No Results Message */}
          {filteredTemplates.length === 0 && searchTerm && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-500">Try searching for a different term or browse all templates.</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Show All Templates
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Workbook Naming Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Create New Workbook</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template: {selectedTemplate?.name}
              </label>
              <div className="text-sm text-gray-500 mb-3">
                {selectedTemplate?.description}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workbook Name
              </label>
              <input
                type="text"
                value={workbookName}
                onChange={(e) => setWorkbookName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter workbook name..."
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkbook()}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNameDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkbook}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Create Workbook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {activeCommand !== 'New' && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {activeCommand} command activated - Python integration ready
        </div>
      )}
    </div>
  );
}