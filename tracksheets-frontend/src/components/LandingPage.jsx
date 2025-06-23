
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

import TrackSheetsApp from './Worksheet';
import backendService from '../services/backendService';

export default function ExcelLandingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCommand, setActiveCommand] = useState('New');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [workbookName, setWorkbookName] = useState('');
  const [showMainApp, setShowMainApp] = useState(false);
  const [workbookData, setWorkbookData] = useState(null);
  const [nameCheckStatus, setNameCheckStatus] = useState(null); // 'available', 'exists', 'checking', 'error'
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [existingWorkbooks, setExistingWorkbooks] = useState([]);
  const [selectedWorkbook, setSelectedWorkbook] = useState(null);
  const [loadingWorkbooks, setLoadingWorkbooks] = useState(false);

  const templates = [
    { 
      name: 'Blank_Workbook', 
      displayName: 'Blank Workbook',
      icon: Grid3X3, 
      description: 'Start with a clean slate',
      category: 'General',
      preview: 'bg-white border-2 border-gray-300'
    },
    { 
      name: 'Personal_Monthly_Budget', 
      displayName: 'Personal Monthly Budget',
      icon: Calculator, 
      description: 'Track your personal expenses and income',
      category: 'Budget',
      preview: 'bg-green-50 border-2 border-green-200'
    },
    { 
      name: 'Sales_Report', 
      displayName: 'Sales Report',
      icon: TrendingUp, 
      description: 'Analyze sales performance and trends',
      category: 'Business',
      preview: 'bg-blue-50 border-2 border-blue-200'
    },
    { 
      name: 'Project_Timeline', 
      displayName: 'Project Timeline',
      icon: Calendar, 
      description: 'Plan and track project milestones',
      category: 'Project',
      preview: 'bg-purple-50 border-2 border-purple-200'
    },
    { 
      name: 'Expense_Tracker', 
      displayName: 'Expense Tracker',
      icon: PieChart, 
      description: 'Monitor spending by category',
      category: 'Budget',
      preview: 'bg-yellow-50 border-2 border-yellow-200'
    },
    { 
      name: 'Customer_Database', 
      displayName: 'Customer Database',
      icon: FileSpreadsheet, 
      description: 'Manage customer information and data',
      category: 'Business',
      preview: 'bg-red-50 border-2 border-red-200'
    },
    { 
      name: 'Inventory_List', 
      displayName: 'Inventory List',
      icon: ClipboardList, 
      description: 'Track products and stock levels',
      category: 'Business',
      preview: 'bg-indigo-50 border-2 border-indigo-200'
    },
    { 
      name: 'Task_Planner', 
      displayName: 'Task Planner',
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

  // Check if workbook name is available
  const checkNameAvailability = async (name) => {
    if (!name || name.trim().length < 2) {
      setNameCheckStatus(null);
      return;
    }
  
    try {
      setNameCheckStatus('checking');
      
      const result = await backendService.get(`/api/workbook/check-name/${encodeURIComponent(name.trim())}`);
      
      if (result.available) {
        setNameCheckStatus('available');
        console.log(`✅ Name "${name}" is available`);
      } else {
        setNameCheckStatus('exists');
        console.log(`❌ Name "${name}" already exists`);
      }
    } catch (error) {
      setNameCheckStatus('error');
      console.error('Failed to check name availability:', error);
    }
  };

  // 🔧 REPLACE your handleWorkbookNameChange function with this:
  const handleWorkbookNameChange = (newName) => {
    setWorkbookName(newName);
    
    // Clear previous timeout
    if (window.nameCheckTimeout) {
      clearTimeout(window.nameCheckTimeout);
    }
    
    // 🆕 IMMEDIATE validation feedback (no delay)
    const validation = validateWorkbookName(newName);
    if (!validation.valid) {
      setNameCheckStatus('invalid');
      setValidationMessage(validation.error);
      console.log(`❌ Invalid name: ${validation.error}`);
      return; // Don't check availability if format is invalid
    }
    
    // Clear invalid status if name becomes valid
    if (nameCheckStatus === 'invalid') {
      setNameCheckStatus(null);
      setValidationMessage('');
    }
    
    // Debounce availability checking for valid names only
    window.nameCheckTimeout = setTimeout(() => {
      checkNameAvailability(newName);
    }, 500);
  };

  // 🔧 REPLACE your handleTemplateClick function with this:
  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    
    // 🆕 NEW: Create underscore-friendly default name
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB').replace(/\//g, '_'); // DD_MM_YYYY
    const templateNameSafe = template.name.replace(/\s+/g, '_'); // Replace spaces with underscores
    
    setWorkbookName(`${templateNameSafe}_${dateStr}`);
    setShowNameDialog(true);
  };

  const handleNameInputChange = (e) => {
    let newValue = e.target.value;
    
    // 🆕 OPTION 1: Prevent spaces entirely (replace spaces with underscores)
    newValue = newValue.replace(/\s+/g, '_');
    
    // 🆕 OPTION 2: Or block spaces completely (uncomment this instead of above)
    // if (newValue.includes(' ')) {
    //   setValidationMessage('❌ Spaces are not allowed. Use underscores (_) instead.');
    //   setNameCheckStatus('invalid');
    //   return; // Don't update the field
    // }
    
    handleWorkbookNameChange(newValue);
  };


  // Handle workbook creation
  const handleCreateWorkbook = async () => {
    // 🆕 STEP 1: Validate name format before proceeding
    const validation = validateWorkbookName(workbookName);
    if (!validation.valid) {
      alert(`❌ Invalid workbook name: ${validation.error}`);
      setNameCheckStatus('invalid');
      setValidationMessage(validation.error);
      return; // Block creation
    }
  
    // 🆕 STEP 2: Check if name is available
    if (nameCheckStatus !== 'available') {
      if (nameCheckStatus === 'exists') {
        alert('❌ This workbook name already exists. Please choose a different name.');
        return;
      } else if (nameCheckStatus === 'checking') {
        alert('⏳ Please wait while we check name availability.');
        return;
      } else {
        // Force a name availability check if status is unclear
        console.log('🔄 Forcing name availability check...');
        await checkNameAvailability(workbookName);
        if (nameCheckStatus !== 'available') {
          alert('❌ Please choose a valid, available workbook name.');
          return;
        }
      }
    }
  
    // 🆕 STEP 3: Final validation before backend call
    if (!workbookName.trim()) {
      alert('❌ Please enter a workbook name');
      return;
    }
  
    console.log(`✅ All validations passed. Creating workbook: "${workbookName}"`);
  
    try {
      console.log('🚀 Sending workbook creation request to backend...');
      
      const result = await backendService.post('/api/workbook/create', {
        name: workbookName,           // Use the validated name as-is (no spaces)
        template: selectedTemplate.name,  // Use internal template name (with underscores)
        category: selectedTemplate.category
      });
  
      if (result.success) {
        console.log('✅ Backend response:', result);
        setWorkbookData({
          ...result,
          isNew: true
        });
        setShowNameDialog(false);
        setShowMainApp(true);
      } else {
        console.error('❌ Backend error:', result);
        alert(`❌ Failed to create workbook: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error creating workbook:', error);
      alert(`❌ Failed to create workbook: ${error.message}`);
    }
  };

  const handleOpenFile = async () => {
  setShowOpenDialog(true);
  setSelectedWorkbook(null);
  await loadExistingWorkbooks();
};

  // Load existing workbooks from backend
  const loadExistingWorkbooks = async () => {
    try {
      setLoadingWorkbooks(true);
      console.log('🔍 Loading existing workbooks...');
      
      const result = await backendService.get('/api/workbooks');
      
      if (result.success) {
        console.log('✅ Loaded workbooks:', result.workbooks);
        setExistingWorkbooks(result.workbooks);
        return result.workbooks;
      } else {
        throw new Error(result.message || 'Failed to load workbooks');
      }
    } catch (error) {
      console.error('❌ Error loading workbooks:', error);
      alert(`❌ Failed to load existing workbooks: ${error.message}`);
      return [];
    } finally {
      setLoadingWorkbooks(false);
    }
  };

  // Open existing workbook
  const handleOpenWorkbook = async (workbook) => {
    try {
      console.log('📂 Opening workbook:', workbook.name);
      
      const result = await backendService.get(`/api/workbook/${encodeURIComponent(workbook.name)}`);
      
      if (result.success) {
        const initialData = get_template_initial_data(workbook.template || 'Blank');
        
        const workbookData = {
          ...result.workbook,
          initialData: initialData
        };
        
        console.log('✅ Loaded workbook data:', workbookData);
        setWorkbookData(workbookData);
        setShowOpenDialog(false);
        setShowMainApp(true);
      } else {
        throw new Error(result.message || 'Failed to load workbook');
      }
    } catch (error) {
      console.error('❌ Error opening workbook:', error);
      alert(`❌ Failed to open workbook: ${error.message}`);
    }
  };

  // Validate workbook name format (no spaces allowed)
  const validateWorkbookName = (name) => {
    const trimmed = name.trim();
    
    // Rules:
    // - Must be at least 2 characters
    // - Only letters, numbers, underscores, and hyphens allowed
    // - No spaces allowed
    // - Cannot start or end with underscore or hyphen
    
    if (trimmed.length < 2) {
      return { valid: false, error: 'Name must be at least 2 characters long' };
    }
    
    if (trimmed.length > 50) {
      return { valid: false, error: 'Name must be less than 50 characters' };
    }
    
    // Check for invalid characters (anything except letters, numbers, underscore, hyphen)
    const invalidChars = /[^a-zA-Z0-9_-]/;
    if (invalidChars.test(trimmed)) {
      return { 
        valid: false, 
        error: 'Only letters, numbers, underscores (_) and hyphens (-) are allowed. No spaces.' 
      };
    }
    
    // Cannot start or end with underscore or hyphen
    if (trimmed.startsWith('_') || trimmed.startsWith('-') || trimmed.endsWith('_') || trimmed.endsWith('-')) {
      return { 
        valid: false, 
        error: 'Name cannot start or end with underscore or hyphen' 
      };
    }
    
    // Check for consecutive special characters
    if (/[_-]{2,}/.test(trimmed)) {
      return { 
        valid: false, 
        error: 'Cannot have consecutive underscores or hyphens' 
      };
    }
    
    return { valid: true, error: null };
  };

  // Helper function to get template initial data (same as backend)
  const get_template_initial_data = (template) => {
    const templates = {
      'Customer_Database': {
        'columns': [
          'Name', 'Address', 'Postcode', 'Date of Birth', 'Telephone Number',
          'Email', 'Original Loan Amount', 'Regular Payment Amount',
          'Payment Frequency', 'Loan Amount Outstanding', 'Credit Card Number'
        ],
        'rows': []
      },
      'Personal_Monthly_Budget': {
        'columns': ['Category', 'Budgeted Amount', 'Actual Amount', 'Difference', 'Notes'],
        'rows': [
          ['Housing', '1200', '1200', '0', 'Rent and utilities'],
          ['Food', '400', '0', '400', 'Groceries and dining'],
          ['Transportation', '300', '0', '300', 'Car payment and gas']
        ]
      },
      'Project_Timeline': {
        'columns': ['Task', 'Start Date', 'End Date', 'Status', 'Assigned To', 'Priority'],
        'rows': []
      },
      'Sales_Report': {
        'columns': ['Date', 'Product', 'Sales Amount', 'Units Sold', 'Region'],
        'rows': []
      },
      'Expense_Tracker': {
        'columns': ['Date', 'Category', 'Description', 'Amount', 'Payment Method'],
        'rows': []
      },
      'Inventory_List': {
        'columns': ['Item Name', 'Category', 'Quantity', 'Unit Price', 'Total Value', 'Supplier'],
        'rows': []
      },
      'Task_Planner': {
        'columns': ['Task', 'Priority', 'Due Date', 'Status', 'Notes'],
        'rows': []
      }
    };
    
    return templates[template] || {'columns': [], 'rows': []};
  };

  const handleSaveFile = async () => {
    console.log('Saving current file...');
    // TODO: Implement save functionality
  };

  const handleSaveAsFile = async () => {
    console.log('Save As dialog...');
    // TODO: Implement save as dialog
  };

  const handlePrintFile = async () => {
    console.log('Print dialog...');
    // TODO: Implement print functionality
  };

  const handleShareFile = async () => {
    console.log('Share dialog...');
    // TODO: Implement share functionality
  };

  const handleExportFile = async () => {
    console.log('Export dialog...');
    // TODO: Implement export functionality
  };

  const handleCloseFile = async () => {
    console.log('Closing application...');
    // TODO: Implement close functionality
  };

  const filteredTemplates = templates.filter(template =>
    template.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If main app should be shown, render it instead
  // If main app should be shown, render the main TrackSheets application
if (showMainApp) {
  return (
    <TrackSheetsApp 
      workbookData={workbookData}
      onClose={() => setShowMainApp(false)}
      onSave={handleSaveFile}
      onExport={handleExportFile}
    />
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

       {/* Open Workbook Dialog */}
      {showOpenDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-w-[90vw] max-h-[80vh] mx-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Open Existing Workbook</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadExistingWorkbooks}
                  disabled={loadingWorkbooks}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                  title="Refresh workbook list"
                >
                  <Search className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <button 
                  onClick={() => setShowOpenDialog(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold px-3 py-1 hover:bg-gray-100 rounded"
                >
                  ×
                </button>
              </div>
            </div>
            
            {loadingWorkbooks ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <span className="ml-3 text-gray-600">Loading workbooks...</span>
              </div>
            ) : existingWorkbooks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Workbooks Found</h3>
                <p className="text-gray-500 mb-4">You haven't created any workbooks yet.</p>
                <button 
                  onClick={() => {
                    setShowOpenDialog(false);
                    setActiveCommand('New');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Create Your First Workbook
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid gap-3 max-h-96">
                  {existingWorkbooks.map((workbook, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedWorkbook(workbook)}
                      className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                        selectedWorkbook?.id === workbook.id
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-green-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate mb-1">
                            {workbook.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(workbook.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              {workbook.created_by || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              workbook.template === 'Customer Database' ? 'bg-red-100 text-red-800' :
                              workbook.template === 'Personal Monthly Budget' ? 'bg-green-100 text-green-800' :
                              workbook.template === 'Project Timeline' ? 'bg-purple-100 text-purple-800' :
                              workbook.template === 'Sales Report' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {workbook.template || 'Blank'}
                            </span>
                            <span className="text-xs text-gray-400">
                              v{workbook.version || '1.0'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {selectedWorkbook?.id === workbook.id && (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Additional workbook info */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>ID: {workbook.id}</span>
                          <span>Category: {workbook.category || 'General'}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Dialog Footer */}
            {existingWorkbooks.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {existingWorkbooks.length} workbook{existingWorkbooks.length !== 1 ? 's' : ''} available
                  {selectedWorkbook && (
                    <span className="ml-2 font-medium text-gray-700">
                      • Selected: {selectedWorkbook.name}
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowOpenDialog(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => selectedWorkbook && handleOpenWorkbook(selectedWorkbook)}
                    disabled={!selectedWorkbook}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      selectedWorkbook
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Open Workbook
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}    


      {/* Workbook Naming Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Create New Workbook</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template: {selectedTemplate?.displayName}
              </label>
              <div className="text-sm text-gray-500 mb-3">
                {selectedTemplate?.description}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workbook Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={workbookName}
                  onChange={handleNameInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    nameCheckStatus === 'available' ? 'border-green-300 focus:ring-green-500 bg-green-50' :
                    nameCheckStatus === 'exists' ? 'border-red-300 focus:ring-red-500 bg-red-50' :
                    nameCheckStatus === 'checking' ? 'border-yellow-300 focus:ring-yellow-500 bg-yellow-50' :
                    'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Enter workbook name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nameCheckStatus === 'available') {
                      handleCreateWorkbook();
                    }
                    // 🆕 Block spaces on keypress too
                    if (e.key === ' ') {
                      e.preventDefault();
                      setValidationMessage('❌ Spaces are not allowed. Use underscores (_) instead.');
                      setNameCheckStatus('invalid');
                    }
                  }}
                />
                
                {/* Status indicator */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {nameCheckStatus === 'checking' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                  )}
                  {nameCheckStatus === 'available' && (
                    <span className="text-green-500 text-lg">✓</span>
                  )}
                  {nameCheckStatus === 'exists' && (
                    <span className="text-red-500 text-lg">✗</span>
                  )}
                  {nameCheckStatus === 'error' && (
                    <span className="text-orange-500 text-lg">⚠</span>
                  )}
                </div>
              </div>
              
              {/* Status message */}
              {nameCheckStatus && (
                <div className={`mt-2 text-sm ${
                  nameCheckStatus === 'available' ? 'text-green-600' :
                  nameCheckStatus === 'exists' ? 'text-red-600' :
                  nameCheckStatus === 'checking' ? 'text-yellow-600' :
                  'text-orange-600'
                }`}>
                  {nameCheckStatus === 'checking' && '🔍 Checking availability...'}
                  {nameCheckStatus === 'available' && '✅ Name is available!'}
                  {nameCheckStatus === 'exists' && '❌ Name already exists - choose a different name'}
                  {nameCheckStatus === 'error' && '⚠️ Error checking name - please try again'}
                </div>
              )}
              
              {/* Manual check button */}
              <button
                type="button"
                onClick={() => checkNameAvailability(workbookName)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Check name availability
              </button>
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
                disabled={!workbookName.trim() || nameCheckStatus !== 'available' || nameCheckStatus === 'invalid'}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  !workbookName.trim() || nameCheckStatus !== 'available' || nameCheckStatus === 'invalid'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {nameCheckStatus === 'checking' ? 'Checking...' :
                 nameCheckStatus === 'exists' ? 'Name Unavailable' :
                 nameCheckStatus === 'invalid' ? 'Invalid Name' :
                 nameCheckStatus === 'available' ? 'Create Workbook' :
                 'Enter Valid Name'}
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


<div className="fixed bottom-4 left-4 bg-white border p-3 rounded shadow">
  <button 
    onClick={async () => {
      try {
        const config = await backendService.get('/api/config');
        alert(`✅ Connected to: ${backendService.getCurrentBackendUrl()}`);
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      }
    }}
    className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
  >
    Test Backend
  </button>
</div>