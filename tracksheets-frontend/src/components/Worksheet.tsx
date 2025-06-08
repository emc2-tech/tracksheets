import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Share2, 
  History, 
  GitBranch, 
  Users, 
  Download,
  ChevronDown,
  Plus,
  Edit3,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Camera,
  Clock,
  User,
  Eye,
  Grid3X3,
  ArrowLeft
} from 'lucide-react';

export default function TrackSheetsApp({ workbookData, onClose, onSave, onExport }) {
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [activeColumn, setActiveColumn] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedRowHistory, setSelectedRowHistory] = useState(null);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [emailDetails, setEmailDetails] = useState({ customer: '', change: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Initialize data based on workbook template
  const [data, setData] = useState([]);
  const [validationStatus, setValidationStatus] = useState([]);
  const [pendingChanges, setPendingChanges] = useState(new Set());
  const [activeRows, setActiveRows] = useState(new Set());
  const [columns, setColumns] = useState([]);

  // Initialize columns and data based on template
  useEffect(() => {
    if (workbookData && workbookData.initialData) {
      const templateData = workbookData.initialData;
      
      if (templateData.columns && templateData.columns.length > 0) {
        // Create columns from template
        const newColumns = templateData.columns.map((colName, index) => ({
          id: String.fromCharCode(65 + index), // A, B, C, etc.
          name: colName,
          type: detectColumnType(colName),
          width: calculateColumnWidth(colName),
          sensitivity: detectSensitivity(colName),
          required: index < 3, // First 3 columns required by default
          validation: detectValidationType(colName)
        }));

        // Add action columns for certain templates
        if (workbookData.template === 'Customer Database') {
          newColumns.push(
            { id: 'L', name: 'Send for Validation', type: 'action', width: 140, sensitivity: 'Standard' },
            { id: 'M', name: 'Customer Validation', type: 'status', width: 140, sensitivity: 'Standard' }
          );
        }

        setColumns(newColumns);
        
        // Set initial data
        if (templateData.rows && templateData.rows.length > 0) {
          setData(templateData.rows);
          // Initialize validation status for existing rows
          const statusArray = new Array(templateData.rows.length).fill(null);
          setValidationStatus(statusArray);
          // Mark all rows as active
          const activeRowsSet = new Set();
          for (let i = 0; i < templateData.rows.length; i++) {
            activeRowsSet.add(i);
          }
          setActiveRows(activeRowsSet);
        } else {
          // Empty template
          setData([]);
          setValidationStatus([]);
          setActiveRows(new Set());
        }
      } else {
        // Blank workbook - no predefined columns
        setColumns([]);
        setData([]);
        setValidationStatus([]);
        setActiveRows(new Set());
      }
    } else {
      // Fallback to default Customer Database if no workbook data
      initializeDefaultCustomerDatabase();
    }
  }, [workbookData]);

  // Helper functions for column detection
  const detectColumnType = (colName) => {
    const name = colName.toLowerCase();
    if (name.includes('date') || name.includes('birth')) return 'date';
    if (name.includes('amount') || name.includes('price') || name.includes('cost') || name.includes('revenue')) return 'number';
    if (name.includes('quantity') || name.includes('stock') || name.includes('count')) return 'number';
    return 'text';
  };

  const calculateColumnWidth = (colName) => {
    const name = colName.toLowerCase();
    if (name.includes('address') || name.includes('description')) return 200;
    if (name.includes('email')) return 180;
    if (name.includes('amount') || name.includes('outstanding')) return 160;
    if (name.includes('phone') || name.includes('telephone')) return 140;
    if (name.includes('postcode') || name.includes('zip')) return 100;
    return 150;
  };

  const detectSensitivity = (colName) => {
    const name = colName.toLowerCase();
    if (name.includes('credit card') || name.includes('card number')) return 'PCI';
    if (name.includes('name') || name.includes('address') || name.includes('phone') || 
        name.includes('email') || name.includes('birth')) return 'PII';
    return 'Standard';
  };

  const detectValidationType = (colName) => {
    const name = colName.toLowerCase();
    if (name.includes('email')) return 'email';
    if (name.includes('phone') || name.includes('telephone')) return 'phone';
    if (name.includes('postcode') || name.includes('zip')) return 'postcode';
    if (name.includes('date') || name.includes('birth')) return 'date';
    if (name.includes('amount') || name.includes('price') || name.includes('cost')) return 'currency';
    if (name.includes('credit card') || name.includes('card number')) return 'creditcard';
    if (name.includes('frequency')) return 'frequency';
    if (name.includes('name')) return 'name';
    return 'text';
  };

  // Initialize default customer database if no template data
  const initializeDefaultCustomerDatabase = () => {
    const defaultColumns = [
      { id: 'A', name: 'Name', type: 'text', width: 150, sensitivity: 'PII', required: true, validation: 'name' },
      { id: 'B', name: 'Address', type: 'text', width: 200, sensitivity: 'PII', required: true, validation: 'address' },
      { id: 'C', name: 'Postcode', type: 'text', width: 100, sensitivity: 'Standard', required: true, validation: 'postcode' },
      { id: 'D', name: 'Date of Birth', type: 'date', width: 120, sensitivity: 'PII', required: true, validation: 'date' },
      { id: 'E', name: 'Telephone Number', type: 'text', width: 140, sensitivity: 'PII', required: true, validation: 'phone' },
      { id: 'F', name: 'Email', type: 'text', width: 180, sensitivity: 'PII', required: true, validation: 'email' },
      { id: 'G', name: 'Original Loan Amount', type: 'number', width: 160, sensitivity: 'Standard', required: true, validation: 'currency' },
      { id: 'H', name: 'Regular Payment Amount', type: 'number', width: 160, sensitivity: 'Standard', required: true, validation: 'currency' },
      { id: 'I', name: 'Payment Frequency', type: 'text', width: 140, sensitivity: 'Standard', required: true, validation: 'frequency' },
      { id: 'J', name: 'Loan Amount Outstanding', type: 'number', width: 180, sensitivity: 'Standard', required: true, validation: 'currency' },
      { id: 'K', name: 'Credit Card Number', type: 'text', width: 160, sensitivity: 'PCI', required: false, validation: 'creditcard' },
      { id: 'L', name: 'Send for Validation', type: 'action', width: 140, sensitivity: 'Standard' },
      { id: 'M', name: 'Customer Validation', type: 'status', width: 140, sensitivity: 'Standard' }
    ];

    setColumns(defaultColumns);
    setData([]);
    setValidationStatus([]);
    setActiveRows(new Set());
  };

  const versionHistory = [
    { id: 'v1.1', author: 'System', timestamp: 'Just now', changes: `Created workbook: ${workbookData?.name || 'New Workbook'}`, type: 'create' }
  ];

  const collaborators = [
    { name: 'Current User', status: 'editing', avatar: 'CU' }
  ];

  const dataTypes = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'boolean', label: 'True/False', icon: ToggleLeft }
  ];

  const sensitivityLevels = [
    { value: 'Standard', label: 'Standard', color: 'bg-gray-100 text-gray-800' },
    { value: 'PII', label: 'PII (Personal Info)', color: 'bg-blue-100 text-blue-800' },
    { value: 'PCI', label: 'PCI (Payment Card)', color: 'bg-red-100 text-red-800' },
    { value: 'PHI', label: 'PHI (Health Info)', color: 'bg-green-100 text-green-800' },
    { value: 'Confidential', label: 'Confidential', color: 'bg-purple-100 text-purple-800' }
  ];

  // Helper functions
  const getTypeIcon = (type) => {
    const typeConfig = dataTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : Type;
  };

  const getSensitivityColor = (sensitivity) => {
    const sensitivityConfig = sensitivityLevels.find(s => s.value === sensitivity);
    return sensitivityConfig ? sensitivityConfig.color : 'bg-gray-100 text-gray-800';
  };

  const maskCreditCard = (cardNumber) => {
    if (!cardNumber) return '';
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return cardNumber;
    return `**** **** **** ${cleaned.slice(-4)}`;
  };

  const getRowHistory = (rowIndex) => {
    return [
      { version: 'v1.1', field: 'Row Created', oldValue: null, newValue: 'New row added from template', author: 'System', timestamp: 'Just now' }
    ];
  };

  const getEmptyRowHistory = (rowIndex) => {
    if (!activeRows.has(rowIndex)) return [];
    return [
      { version: 'v1.2', field: 'Row Created', oldValue: null, newValue: 'New row activated', author: 'Current User', timestamp: 'Just now' }
    ];
  };

  // Validation functions (simplified for templates)
  const validateField = (value, column, rowIndex) => {
    const errors = [];
    const warnings = [];
    const suggestions = [];

    if (column.required && (!value || value.toString().trim() === '')) {
      errors.push(`${column.name} is required`);
    }

    if (!value || value.toString().trim() === '') {
      return { errors, warnings, suggestions, isValid: !column.required };
    }

    const strValue = value.toString().trim();

    // Basic validation based on column type
    switch (column.validation) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(strValue)) {
          errors.push('Invalid email format');
          suggestions.push('Format: name@domain.com');
        }
        break;

      case 'currency':
        const amount = parseFloat(strValue);
        if (isNaN(amount) || amount < 0) {
          errors.push('Must be a valid positive number');
        }
        break;

      case 'date':
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(strValue)) {
          errors.push('Invalid date format');
          suggestions.push('Format: YYYY-MM-DD');
        }
        break;
    }

    return { 
      errors, 
      warnings, 
      suggestions, 
      isValid: errors.length === 0 
    };
  };

  const getFieldValidationStatus = (rowIndex, colIndex) => {
    const key = `${rowIndex}-${colIndex}`;
    const validation = validationErrors[key];
    if (!validation) return null;
    
    if (validation.errors.length > 0) return 'error';
    if (validation.warnings.length > 0) return 'warning';
    return 'success';
  };

  const getCustomerValidationStatus = (rowIndex) => {
    const status = validationStatus[rowIndex];
    if (status === true) {
      return { icon: '✓', color: 'bg-green-100 text-green-800', label: 'Validated' };
    } else if (status === false) {
      return { icon: '⏳', color: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
    } else {
      return { icon: '—', color: 'bg-gray-100 text-gray-500', label: 'No Changes' };
    }
  };

  // Event handlers
  const handleDoubleClick = (rowIndex, colIndex) => {
    if (colIndex >= columns.length - 2) return; // Skip action columns
    setEditingCell(`${rowIndex}-${colIndex}`);
    setEditValue(String(data[rowIndex]?.[colIndex] || ''));
  };

  const handleKeyPress = (e, rowIndex, colIndex) => {
    if (e.key === 'Enter') {
      const column = columns[colIndex];
      const validation = validateField(editValue, column, rowIndex);
      
      const newValidationErrors = { ...validationErrors };
      newValidationErrors[`${rowIndex}-${colIndex}`] = validation;
      setValidationErrors(newValidationErrors);
      
      if (validation.errors.length > 0) {
        const errorMsg = validation.errors.join(', ');
        const suggestionMsg = validation.suggestions.length > 0 ? 
          ` | Correct format: ${validation.suggestions.join(', ')}` : '';
        setValidationMessage(`❌ ${errorMsg}${suggestionMsg}`);
        setShowValidationPopup(true);
        setTimeout(() => setShowValidationPopup(false), 5000);
        return;
      }
      
      // Update data
      const newData = [...data];
      while (newData.length <= rowIndex) {
        newData.push(new Array(columns.length - 2).fill(''));
      }
      newData[rowIndex][colIndex] = editValue;
      setData(newData);
      
      const newPendingChanges = new Set(pendingChanges);
      newPendingChanges.add(rowIndex);
      setPendingChanges(newPendingChanges);
      
      setEditingCell(null);
      setEditValue('');
      setShowUpdatePopup(true);
      setTimeout(() => setShowUpdatePopup(false), 2000);
      
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const sendForValidation = (rowIndex) => {
    const newPendingChanges = new Set(pendingChanges);
    newPendingChanges.delete(rowIndex);
    setPendingChanges(newPendingChanges);
    
    const newValidationStatus = [...validationStatus];
    newValidationStatus[rowIndex] = false;
    setValidationStatus(newValidationStatus);
    
    setEmailDetails({
      customer: data[rowIndex]?.[0] || 'Unknown',
      email: data[rowIndex]?.[1] || 'No email',
      change: 'Changes sent for validation'
    });
    setShowEmailPopup(true);
    setTimeout(() => setShowEmailPopup(false), 4000);
  };

  const simulateCustomerApproval = (rowIndex) => {
    const newValidationStatus = [...validationStatus];
    newValidationStatus[rowIndex] = true;
    setValidationStatus(newValidationStatus);
  };

  const activateRow = (rowIndex) => {
    const newActiveRows = new Set(activeRows);
    newActiveRows.add(rowIndex);
    setActiveRows(newActiveRows);
    
    const newData = [...data];
    while (newData.length <= rowIndex) {
      newData.push(new Array(Math.max(1, columns.length - 2)).fill(''));
    }
    setData(newData);
    
    const newValidationStatus = [...validationStatus];
    while (newValidationStatus.length <= rowIndex) {
      newValidationStatus.push(null);
    }
    setValidationStatus(newValidationStatus);
  };

  // Add new column function
  const addNewColumn = () => {
    const newColumnId = String.fromCharCode(65 + columns.length);
    const newColumn = {
      id: newColumnId,
      name: `Column ${newColumnId}`,
      type: 'text',
      width: 150,
      sensitivity: 'Standard',
      required: false,
      validation: 'text'
    };
    
    setColumns([...columns, newColumn]);
    setActiveColumn(newColumn);
    setShowColumnConfig(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">TrackSheets</h1>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-lg font-medium text-gray-700">
              {workbookData?.name || 'New Workbook'}
            </span>
            {workbookData?.template && (
              <>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-500">{workbookData.template}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {collaborators.map((user, index) => (
                <div key={index} className="relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white ${
                    user.status === 'online' ? 'bg-green-500' : 
                    user.status === 'editing' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}>
                    {user.avatar}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    user.status === 'online' ? 'bg-green-400' : 
                    user.status === 'editing' ? 'bg-blue-400' : 'bg-gray-400'
                  }`}></div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
            
            <button 
              onClick={onSave}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            
            <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Version History Sidebar */}
        {showVersionHistory && (
          <div className="w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <GitBranch className="w-4 h-4 mr-2" />
                Version History
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {versionHistory.map((version, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900">{version.id}</span>
                    <span className="text-xs text-gray-500">{version.timestamp}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{version.changes}</div>
                  <div className="flex items-center space-x-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{version.author}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      version.type === 'create' ? 'bg-green-100 text-green-800' :
                      version.type === 'snapshot' ? 'bg-blue-100 text-blue-800' :
                      version.type === 'add' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {version.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Spreadsheet */}
        <div className="flex-1">
          {/* Column Configuration Panel */}
          {showColumnConfig && (
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Configure Column: {activeColumn?.name || 'New Column'}</h3>
                <button 
                  onClick={() => setShowColumnConfig(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Column Name</label>
                  <input 
                    type="text" 
                    defaultValue={activeColumn?.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Data Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {dataTypes.map(type => (
                      <option key={type.value} value={type.value} selected={activeColumn?.type === type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Sensitivity Level</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {sensitivityLevels.map(level => (
                      <option key={level.value} value={level.value} selected={activeColumn?.sensitivity === level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
                  Update Column
                </button>
              </div>
            </div>
          )}

          {/* Empty State for Blank Workbooks */}
          {columns.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Grid3X3 className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Welcome to your new {workbookData?.template || 'Blank'} workbook!
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Start by adding columns to structure your data. You can customize column types, sensitivity levels, and validation rules.
                </p>
                <button
                  onClick={addNewColumn}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Your First Column</span>
                </button>
              </div>
            </div>
          )}

          {/* Spreadsheet Container */}
          {columns.length > 0 && (
            <div className="overflow-auto">
              <table className="w-full border-collapse bg-white">
                {/* Header Row */}
                <thead>
                  <tr className="bg-gray-100">
                    <th className="w-12 border border-gray-300 p-2 text-center text-sm font-medium text-gray-700">#</th>
                    {columns.map((col, index) => (
                      <th 
                        key={col.id} 
                        className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700 group hover:bg-gray-200 cursor-pointer"
                        style={{ width: col.width }}
                        onClick={() => {
                          setActiveColumn(col);
                          setShowColumnConfig(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {React.createElement(getTypeIcon(col.type), { className: 'w-4 h-4 text-gray-500' })}
                            <span>{col.name || `Column ${col.id}`}</span>
                            {col.required && (
                              <span className="text-red-500 text-xs font-bold">*</span>
                            )}
                            {col.sensitivity && col.sensitivity !== 'Standard' && (
                              <span className={`text-xs px-2 py-1 rounded-full ${getSensitivityColor(col.sensitivity)}`}>
                                {col.sensitivity}
                              </span>
                            )}
                          </div>
                          <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                        </div>
                      </th>
                    ))}
                    <th className="border border-gray-300 p-2 w-12">
                      <button 
                        onClick={addNewColumn}
                        className="w-full h-full flex items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </th>
                  </tr>
                </thead>

                {/* Data Rows */}
                <tbody>
                  {data.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-1 text-center bg-gray-50">
                          <button
                            onClick={() => {
                              setSelectedRowHistory(selectedRowHistory === rowIndex ? null : rowIndex);
                            }}
                            className={`w-8 h-6 text-xs font-medium rounded transition-colors ${
                              selectedRowHistory === rowIndex
                                ? 'bg-blue-500 text-white'
                                : getRowHistory(rowIndex).length > 0
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {rowIndex + 1}
                          </button>
                        </td>
                        {columns.map((col, colIndex) => (
                          <td 
                            key={`${rowIndex}-${colIndex}`}
                            className={`border border-gray-300 p-2 text-sm cursor-cell relative ${
                              selectedCell === `${rowIndex}-${colIndex}` ? 'bg-blue-100 border-blue-500' : ''
                            } ${
                              editingCell === `${rowIndex}-${colIndex}` ? 'bg-yellow-100 border-yellow-500' : ''
                            } ${
                              getFieldValidationStatus(rowIndex, colIndex) === 'error' ? 'border-red-300 bg-red-50' :
                              getFieldValidationStatus(rowIndex, colIndex) === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                              getFieldValidationStatus(rowIndex, colIndex) === 'success' ? 'border-green-300 bg-green-50' : ''
                            }`}
                            onClick={() => setSelectedCell(`${rowIndex}-${colIndex}`)}
                            onDoubleClick={() => handleDoubleClick(rowIndex, colIndex)}
                          >
                            {editingCell === `${rowIndex}-${colIndex}` ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyPress(e, rowIndex, colIndex)}
                                onBlur={() => setEditingCell(null)}
                                className="w-full bg-transparent border-0 outline-none p-0 text-sm"
                                autoFocus
                              />
                            ) : col.type === 'boolean' ? (
                              <input 
                                type="checkbox" 
                                checked={row[colIndex] || false}
                                className="w-4 h-4"
                              />
                            ) : col.sensitivity === 'PCI' && col.validation === 'creditcard' ? (
                              <span className="font-mono text-sm">
                                {maskCreditCard(row[colIndex])}
                              </span>
                            ) : col.type === 'action' ? (
                              <div className="flex items-center justify-center">
                                {pendingChanges.has(rowIndex) ? (
                                  <button
                                    onClick={() => sendForValidation(rowIndex)}
                                    className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded transition-colors"
                                  >
                                    Send
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </div>
                            ) : col.type === 'status' ? (
                              <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCustomerValidationStatus(rowIndex).color}`}>
                                  <span className="mr-1">{getCustomerValidationStatus(rowIndex).icon}</span>
                                  {getCustomerValidationStatus(rowIndex).label}
                                </span>
                                {validationStatus[rowIndex] === false && (
                                  <button
                                    onClick={() => simulateCustomerApproval(rowIndex)}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                                    title="Simulate customer approval"
                                  >
                                    Approve
                                  </button>
                                )}
                              </div>
                            ) : col.type === 'number' && row[colIndex] ? (
                              <span>
                                {col.validation === 'currency' ? 
                                  `€${Number(row[colIndex]).toLocaleString()}` : 
                                  row[colIndex]
                                }
                              </span>
                            ) : (
                              <span>{row[colIndex] || ''}</span>
                            )}
                          </td>
                        ))}
                        <td className="border border-gray-300 p-2"></td>
                      </tr>
                      
                      {/* Row History Dropdown */}
                      {selectedRowHistory === rowIndex && (
                        <tr>
                          <td colSpan={columns.length + 2} className="p-0 border-0">
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-2 mb-2 rounded shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900 flex items-center">
                                  <History className="w-4 h-4 mr-2 text-blue-600" />
                                  Row History: {row[0] || `Row ${rowIndex + 1}`}
                                </h4>
                                <button 
                                  onClick={() => setSelectedRowHistory(null)}
                                  className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2 py-1 hover:bg-gray-200 rounded"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="space-y-2">
                                {getRowHistory(rowIndex).map((change, changeIndex) => (
                                  <div key={changeIndex} className="bg-white p-3 rounded border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-sm text-blue-700">{change.version}</span>
                                      <span className="text-xs text-gray-500">{change.timestamp}</span>
                                    </div>
                                    <div className="text-sm text-gray-700 mb-1">
                                      <strong>{change.field}:</strong> 
                                      {change.oldValue && (
                                        <span className="mx-2 text-red-600 line-through">{change.oldValue}</span>
                                      )}
                                      {change.oldValue && change.newValue && <span className="mx-1">→</span>}
                                      <span className="text-green-600 font-medium">{change.newValue}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500">
                                      <User className="w-3 h-3 mr-1" />
                                      <span>Changed by {change.author}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  
                  {/* Empty rows for expansion */}
                  {Array.from({ length: 100 }, (_, index) => {
                    const rowIndex = data.length + index;
                    const isActive = activeRows.has(rowIndex);
                    
                    return (
                      <tr key={`empty-${index}`} className={`hover:bg-gray-50 ${isActive ? 'bg-blue-50' : ''}`}>
                        <td className="border border-gray-300 p-1 text-center bg-gray-50">
                          <button
                            onClick={() => {
                              if (!isActive) {
                                activateRow(rowIndex);
                              }
                            }}
                            className={`w-8 h-6 text-xs font-medium rounded transition-colors ${
                              isActive
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-200 text-gray-400 hover:bg-blue-300 hover:text-blue-700'
                            }`}
                          >
                            {rowIndex + 1}
                          </button>
                        </td>
                        {columns.map((col, colIndex) => (
                          <td 
                            key={`empty-${index}-${colIndex}`}
                            className={`border border-gray-300 p-2 text-sm ${
                              isActive ? 'cursor-cell' : 'cursor-not-allowed bg-gray-50'
                            }`}
                            onClick={() => {
                              if (isActive) {
                                setSelectedCell(`${rowIndex}-${colIndex}`);
                              }
                            }}
                          >
                            {/* Empty cell content */}
                          </td>
                        ))}
                        <td className="border border-gray-300 p-2"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Ready</span>
          <span>•</span>
          <span>{data.length} rows</span>
          <span>•</span>
          <span>{columns.filter(col => col.name).length} columns</span>
          {workbookData?.template && (
            <>
              <span>•</span>
              <span>Template: {workbookData.template}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Current: v1.1</span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>1 viewer</span>
          </span>
        </div>
      </div>

      {/* Popup Messages */}
      {showUpdatePopup && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
            <span className="text-green-500 text-sm">✓</span>
          </div>
          <span className="font-medium">Value updated successfully!</span>
        </div>
      )}

      {showValidationPopup && (
        <div className="fixed top-32 right-4 bg-white border-l-4 border-blue-400 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <span className="text-lg">🔍</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-2 text-gray-900">Data Validation</h4>
              <div className="text-sm text-gray-700 leading-relaxed">
                {validationMessage.includes('|') ? (
                  <div>
                    <div className="mb-2">{validationMessage.split('|')[0].trim()}</div>
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 text-blue-800 font-medium">
                      {validationMessage.split('|')[1].trim()}
                    </div>
                  </div>
                ) : (
                  validationMessage
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailPopup && (
        <div className="fixed top-16 right-4 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-500 text-sm">📧</span>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Validation Email Sent</h4>
              <p className="text-xs opacity-90 mb-2">
                Validation email sent to <strong>{emailDetails.customer}</strong>
              </p>
              <p className="text-xs opacity-80 mb-2">
                <strong>Changes:</strong> {emailDetails.change}
              </p>
              <p className="text-xs opacity-75">
                Customer will receive email at {emailDetails.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}