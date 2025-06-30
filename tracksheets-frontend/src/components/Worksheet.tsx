
import { 
  Save, 
  Share2, 
  History, 
  GitBranch, 
  Users, 
  Download,
  Plus,
  Edit3,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Clock,
  User,
  Eye,
  Grid3X3,
  ArrowLeft
} from 'lucide-react';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import backendService from '../services/backendService';

export default function TrackSheetsApp({ workbookData, onClose, onSave, onExport }) {
  // Core UI State
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [activeColumn, setActiveColumn] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedRowHistory, setSelectedRowHistory] = useState(null);
  
  // Notification State
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [emailDetails, setEmailDetails] = useState({ customer: '', email: '', change: '' });
  const [validationErrors, setValidationErrors] = useState({});

  const saveTimeoutRef = useRef(null);
  const pendingChangesRef = useRef(new Map());

  // Column Configuration State
  const [columnConfigForm, setColumnConfigForm] = useState({
    name: '',
    type: 'text',
    sensitivity: 'Standard'
  });

  // Python Backend Integration State
  const [businessActions, setBusinessActions] = useState({});
  const [gitHashes, setGitHashes] = useState({});
  const [loading, setLoading] = useState(false);

  // Data State
  const [data, setData] = useState([]);
  const [validationStatus, setValidationStatus] = useState([]);
  const [pendingChanges, setPendingChanges] = useState(new Set());
  const [activeRows, setActiveRows] = useState(new Set());
  const [columns, setColumns] = useState([]);

  // Debug workbook data
  console.log('🔍 TrackSheetsApp received workbookData:', workbookData);

  // Virtual Scrolling Component - ADD THIS
  const VirtualizedTable = React.memo(({ 
    data, 
    columns, 
    onCellEdit, 
    editingCell,
    editValue,
    setEditValue,
    onKeyPress,
    selectedCell,
    setSelectedCell,
    validationStatus,
    pendingChanges,
    businessActions,
    gitHashes,
    sendForValidation,
    simulateCustomerApproval,
    getCustomerValidationStatus,
    maskCreditCard,
    fetchRowHistory,
    selectedRowHistory,
    setSelectedRowHistory,
    getRowHistory
  }) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });
    const [expandedRows, setExpandedRows] = useState(new Set());
    const containerRef = useRef(null);
    
    // 🔧 FIXED: Exact measurements for perfect alignment
    const BASE_ROW_HEIGHT = 45; // Exact height including borders
    const EXPANDED_ROW_HEIGHT = 300;
    const BUFFER_SIZE = 20;
  
    // Calculate dynamic row heights
    const getRowHeight = useCallback((rowIndex) => {
      return expandedRows.has(rowIndex) ? BASE_ROW_HEIGHT + EXPANDED_ROW_HEIGHT : BASE_ROW_HEIGHT;
    }, [expandedRows]);
  
    // Calculate total height and positions
    const { totalHeight, rowPositions } = useMemo(() => {
      const positions = [];
      let currentTop = 0;
      
      for (let i = 0; i < data.length; i++) {
        positions[i] = currentTop;
        currentTop += getRowHeight(i);
      }
      
      return {
        totalHeight: currentTop,
        rowPositions: positions
      };
    }, [data.length, getRowHeight]);
  
    // Handle scroll with precise calculations
    const handleScroll = useCallback((e) => {
      const scrollTop = e.target.scrollTop;
      const containerHeight = e.target.clientHeight;
      
      let start = 0;
      for (let i = 0; i < rowPositions.length; i++) {
        if (rowPositions[i] >= scrollTop - BUFFER_SIZE * BASE_ROW_HEIGHT) {
          start = Math.max(0, i - BUFFER_SIZE);
          break;
        }
      }
      
      let end = data.length;
      for (let i = start; i < rowPositions.length; i++) {
        if (rowPositions[i] > scrollTop + containerHeight + BUFFER_SIZE * BASE_ROW_HEIGHT) {
          end = Math.min(data.length, i + BUFFER_SIZE);
          break;
        }
      }
      
      setVisibleRange({ start, end });
    }, [rowPositions, data.length, totalHeight]);
  
    // Toggle row history
    const toggleRowHistory = useCallback((rowIndex) => {
      setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(rowIndex)) {
          newSet.delete(rowIndex);
          setSelectedRowHistory(null);
        } else {
          newSet.add(rowIndex);
          setSelectedRowHistory(rowIndex);
        }
        return newSet;
      });
    }, [setSelectedRowHistory]);
  
    // Visible rows calculation
    const visibleRows = useMemo(() => {
      return Array.from({ length: visibleRange.end - visibleRange.start }, (_, index) => {
        const originalIndex = visibleRange.start + index;
        return {
          row: data[originalIndex],
          originalIndex,
          isExpanded: expandedRows.has(originalIndex)
        };
      });
    }, [data, visibleRange, expandedRows]);
  
    return (
      <div className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white">
        {/* 🔧 FIXED: Header with exact alignment */}
        <div className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
          <div className="flex">
            <div 
              className="border-r border-gray-300 p-2 text-center text-sm font-medium text-gray-700 bg-gray-100 flex items-center justify-center"
              style={{ width: '48px', minWidth: '48px', height: '44px' }}
            >
              #
            </div>
            {columns.map((col) => (
              <div 
                key={col.id} 
                className="border-r border-gray-300 p-2 text-left text-sm font-medium text-gray-700 bg-gray-100 group hover:bg-gray-200 cursor-pointer flex items-center"
                style={{ 
                  width: col.width || 150, 
                  minWidth: col.width || 150,
                  height: '44px'
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{col.name}</span>
                    {col.required && <span className="text-red-500 text-xs font-bold">*</span>}
                    {col.sensitivity && col.sensitivity !== 'Standard' && (
                      <span className={`text-xs px-1 py-0.5 rounded-full ${
                        col.sensitivity === 'PII' ? 'bg-blue-100 text-blue-800' :
                        col.sensitivity === 'PCI' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {col.sensitivity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
  
        {/* 🔧 FIXED: Virtual scrolling container with more screen space */}
        <div 
          ref={containerRef}
          className="overflow-auto"
          onScroll={handleScroll}
          style={{ 
            height: 'calc(100vh - 200px)', // Use most of the screen height
            width: '100%'
          }}
        >
          <div 
            style={{ 
              height: totalHeight, 
              position: 'relative',
              width: '100%',
              minHeight: totalHeight // Ensure container is tall enough to scroll
            }}
          >
            {visibleRows.map(({ row, originalIndex, isExpanded }) => (
              <VirtualizedRowWithHistory
                key={originalIndex}
                row={row}
                rowIndex={originalIndex}
                columns={columns}
                isExpanded={isExpanded}
                position={rowPositions[originalIndex]}
                height={getRowHeight(originalIndex)}
                onToggleHistory={toggleRowHistory}
                editingCell={editingCell}
                editValue={editValue}
                setEditValue={setEditValue}
                onKeyPress={onKeyPress}
                selectedCell={selectedCell}
                setSelectedCell={setSelectedCell}
                onCellEdit={onCellEdit}
                validationStatus={validationStatus}
                pendingChanges={pendingChanges}
                sendForValidation={sendForValidation}
                getCustomerValidationStatus={getCustomerValidationStatus}
                maskCreditCard={maskCreditCard}
                fetchRowHistory={fetchRowHistory}
                getRowHistory={getRowHistory}
              />
            ))}
          </div>
        </div>
      </div>
    );
  });
  
  // 🚀 FIXED: Row component with precise alignment
  const VirtualizedRowWithHistory = React.memo(({
    row,
    rowIndex,
    columns,
    isExpanded,
    position,
    height,
    onToggleHistory,
    editingCell,
    editValue,
    setEditValue,
    onKeyPress,
    selectedCell,
    setSelectedCell,
    onCellEdit,
    validationStatus,
    pendingChanges,
    sendForValidation,
    getCustomerValidationStatus,
    maskCreditCard,
    fetchRowHistory,
    getRowHistory
  }) => {
    return (
      <div
        className="absolute left-0 right-0"
        style={{ 
          top: position,
          height: height
        }}
      >
        {/* 🔧 FIXED: Main row with exact measurements */}
        <div className="flex border-b border-gray-300 hover:bg-gray-50">
          {/* Row Number - Clickable for History */}
          <div 
            className="border-r border-gray-300 p-1 text-center bg-gray-50 flex items-center justify-center"
            style={{ width: '48px', minWidth: '48px', height: '44px' }}
          >
            <button
              onClick={() => onToggleHistory(rowIndex)}
              className={`w-8 h-6 text-xs font-medium rounded transition-colors ${
                isExpanded
                  ? 'bg-blue-500 text-white'
                  : getRowHistory && getRowHistory(rowIndex).length > 0
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={isExpanded ? 'Hide history' : 'Show history'}
            >
              {rowIndex + 1}
            </button>
          </div>
  
          {/* Data Cells */}
          {columns.map((col, colIndex) => (
            <div 
              key={`${rowIndex}-${colIndex}`}
              className={`border-r border-gray-300 p-2 text-sm cursor-cell relative flex items-center ${
                selectedCell === `${rowIndex}-${colIndex}` ? 'bg-blue-100 border-blue-500' : ''
              } ${
                editingCell === `${rowIndex}-${colIndex}` ? 'bg-yellow-100 border-yellow-500' : ''
              }`}
              style={{ 
                width: col.width || 150, 
                minWidth: col.width || 150,
                height: '44px'
              }}
              onClick={() => setSelectedCell(`${rowIndex}-${colIndex}`)}
              onDoubleClick={() => {
                if (col.type !== 'action' && col.type !== 'status') {
                  onCellEdit(rowIndex, colIndex);
                }
              }}
            >
              {editingCell === `${rowIndex}-${colIndex}` ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => onKeyPress(e, rowIndex, colIndex)}
                  onBlur={async () => {
                    // Handle blur
                  }}
                  className="w-full bg-transparent border-0 outline-none p-0 text-sm"
                  autoFocus
                />
              ) : col.type === 'boolean' ? (
                <input 
                  type="checkbox" 
                  checked={row[colIndex] || false}
                  className="w-4 h-4"
                />
              ) : col.type === 'action' ? (
                <div className="flex items-center justify-center w-full">
                  {pendingChanges && pendingChanges.has(rowIndex) ? (
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
                <div className="flex items-center justify-between w-full">
                  {getCustomerValidationStatus && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCustomerValidationStatus(rowIndex).color}`}>
                      <span className="mr-1">{getCustomerValidationStatus(rowIndex).icon}</span>
                      {getCustomerValidationStatus(rowIndex).label}
                    </span>
                  )}
                </div>
              ) : col.sensitivity === 'PCI' && col.validation === 'creditcard' ? (
                <span className="font-mono text-sm truncate">
                  {maskCreditCard && maskCreditCard(row[colIndex])}
                </span>
              ) : col.type === 'number' && row[colIndex] ? (
                <span className="truncate">
                  {col.validation === 'currency' ? 
                    `€${Number(row[colIndex]).toLocaleString()}` : 
                    row[colIndex]
                  }
                </span>
              ) : (
                <span className="truncate">{row[colIndex] || ''}</span>
              )}
            </div>
          ))}
        </div>
  
        {/* Expanded Row History */}
        {isExpanded && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mx-2 mb-2 rounded shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg text-gray-900 flex items-center">
                <History className="w-5 h-5 mr-2 text-blue-600" />
                Row History: {row[0] || `Row ${rowIndex + 1}`}
              </h4>
              <button 
                onClick={() => onToggleHistory(rowIndex)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold px-3 py-1 hover:bg-gray-200 rounded"
              >
                ×
              </button>
            </div>
            
            <RowHistoryViewer 
              rowIndex={rowIndex} 
              columns={columns}
              fetchHistory={fetchRowHistory}
            />
          </div>
        )}
      </div>
    );
  });
  
  // Row History Viewer Component
  const RowHistoryViewer = ({ rowIndex, columns, fetchHistory }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const loadHistory = async () => {
        setLoading(true);
        try {
          const historyData = await fetchHistory(rowIndex);
          setHistory(historyData || []);
        } catch (error) {
          console.error('Failed to load history:', error);
          setHistory([]);
        } finally {
          setLoading(false);
        }
      };
      loadHistory();
    }, [rowIndex, fetchHistory]);
  
    const formatTimestamp = (timestamp) => {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
  
    if (loading) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
          <span className="text-sm text-gray-600 mt-2">Loading history...</span>
        </div>
      );
    }
  
    if (history.length === 0) {
      return (
        <div className="text-center py-8">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No history available for this row</p>
        </div>
      );
    }
  
    const dataColumns = columns.filter(col => col.type !== 'action' && col.type !== 'status');
  
    return (
      <div className="space-y-4">
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <div className="space-y-3 p-4">
            {history.map((version, versionIndex) => {
              const changedFields = version.changed_fields || [];
  
              return (
                <div key={version.id || versionIndex} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-sm text-blue-700">
                          {versionIndex === 0 ? 'Current' : `Version -${versionIndex}`}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {version.user_display_name || version.user_email}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(version.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {changedFields.length} changes
                        </span>
                        {version.git_hash && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-mono">
                            {version.git_hash.substring(0, 8)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
  
                  <div className="p-4 overflow-x-auto">
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${dataColumns.length}, minmax(150px, 1fr))` }}>
                      {dataColumns.map((col) => (
                        <div key={col.id} className="text-xs font-medium text-gray-500 pb-1">
                          {col.name}
                        </div>
                      ))}
                      {dataColumns.map((col) => {
                        const fieldName = col.name.toLowerCase().replace(/\s+/g, '_');
                        const cellValue = version.full_row_data?.[fieldName] || '';
                        const isChanged = changedFields.includes(fieldName);
  
                        return (
                          <div key={`${col.id}-data`} className="relative">
                            <div className={`p-2 border rounded text-sm min-h-8 ${
                              isChanged 
                                ? 'bg-purple-50 border-purple-200 text-purple-900' 
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              {col.type === 'number' && cellValue ? (
                                <span>
                                  {col.validation === 'currency' ? 
                                    `€${Number(cellValue).toLocaleString()}` : 
                                    cellValue
                                  }
                                </span>
                              ) : col.sensitivity === 'PCI' && col.validation === 'creditcard' ? (
                                <span className="font-mono text-sm">
                                  {cellValue ? `**** **** **** ${cellValue.slice(-4)}` : ''}
                                </span>
                              ) : (
                                cellValue || <span className="text-gray-400 italic">empty</span>
                              )}
                            </div>
                            
                            {isChanged && (
                              <div className="absolute -top-1 -right-1">
                                <span className="inline-block w-3 h-3 bg-purple-500 rounded-full" 
                                      title="This field was changed"></span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };


  // 🔧 FIXED: Load current data for existing workbooks
  const loadCurrentWorkbookData = async () => {
    try {
      console.log('🔄 Loading current data for existing workbook:', workbookData.name);
      
      // 🔧 FIX: Use backendService instead of hardcoded URL
      const result = await backendService.get(`/api/workbook/${encodeURIComponent(workbookData.name)}/current-data`);
      
      console.log('📥 Backend response:', result);

      // 🔧 FIX: Check correct response structure  
      if (result.success) {
        console.log('✅ Loaded existing data from backend:', {
          columns: result.columns?.length || 0,
          rows: result.rows?.length || 0,
          gitHashes: Object.keys(result.git_hashes || {}).length
        });
        
        // 🔧 FIX: Use columns directly from backend response
        if (result.columns && result.columns.length > 0) {
          console.log('📊 Using columns from backend:', result.columns.map(c => c.name));
          setColumns(result.columns);
        } else {
          console.log('⚠️ No columns in backend response, using template fallback');
          const templateData = workbookData.initialData || get_template_initial_data(workbookData.template);
          const templateColumns = createColumnsFromTemplate(templateData);
          setColumns(templateColumns);
        }

        // 🔧 FIX: Use rows directly from backend response
        if (result.rows && result.rows.length > 0) {
          console.log('📊 Setting data rows:', result.rows.length);
          setData(result.rows);
          
          // Set active rows (rows that have data)
          const activeRowsSet = new Set();
          result.rows.forEach((row, index) => {
            if (row.some(cell => cell !== '' && cell !== null && cell !== undefined)) {
              activeRowsSet.add(index);
            }
          });
          setActiveRows(activeRowsSet);
          console.log('✅ Active rows:', activeRowsSet.size);
          
          // Initialize validation status
          setValidationStatus(new Array(result.rows.length).fill(null));
        } else {
          console.log('📋 No rows in backend response, starting with empty data');
          setData([]);
          setValidationStatus([]);
          setActiveRows(new Set());
        }

        // Set git hashes
        if (result.git_hashes) {
          setGitHashes(result.git_hashes);
          console.log('🔐 Set git hashes for rows:', Object.keys(result.git_hashes));
        }
        
        console.log('🎯 Successfully loaded existing workbook data');
        
      } else {
        console.error('❌ Backend reported failure:', result);
        throw new Error(result.error || 'Backend failed to load data');
      }
      
    } catch (error) {
      console.error('❌ Failed to load current data:', error);
      console.log('🔄 Falling back to template initialization');
      initializeFromTemplate(); // Fallback to template
    }
  };

  // 🆕 Helper function to create columns from template data
  const createColumnsFromTemplate = (templateData) => {
    if (!templateData || !templateData.columns) {
      return [
        {'id': 'A', 'name': 'Column A', 'type': 'text', 'width': 150, 'sensitivity': 'Standard'},
        {'id': 'B', 'name': 'Column B', 'type': 'text', 'width': 150, 'sensitivity': 'Standard'},
        {'id': 'C', 'name': 'Column C', 'type': 'text', 'width': 150, 'sensitivity': 'Standard'}
      ];
    }

    const columns = templateData.columns.map((colName, index) => ({
      id: String.fromCharCode(65 + index), // A, B, C, etc.
      name: colName,
      type: detectColumnType(colName),
      width: calculateColumnWidth(colName),
      sensitivity: detectSensitivity(colName),
      required: index < 3,
      validation: detectValidationType(colName)
    }));

    // Add action columns for Customer Database template
    if (workbookData.template === 'Customer Database') {
      columns.push(
        { id: 'L', name: 'Send for Validation', type: 'action', width: 140, sensitivity: 'Standard' },
        { id: 'M', name: 'Customer Validation', type: 'status', width: 140, sensitivity: 'Standard' }
      );
    }

    return columns;
  };

// 🆕 NEW: Extract template initialization into separate function
const initializeFromTemplate = () => {
  console.log('📋 Initializing from template data');
  
  if (workbookData && workbookData.initialData) {
    const templateData = workbookData.initialData;
    console.log('📋 Using provided template data:', templateData);
    
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

      // Add action columns for Customer Database template
      if (workbookData.template === 'Customer Database') {
        newColumns.push(
          { id: 'L', name: 'Send for Validation', type: 'action', width: 140, sensitivity: 'Standard' },
          { id: 'M', name: 'Customer Validation', type: 'status', width: 140, sensitivity: 'Standard' }
        );
      }

      setColumns(newColumns);
      console.log('📊 Created columns:', newColumns.map(c => c.name));
      
      // Set initial data
      if (templateData.rows && templateData.rows.length > 0) {
        setData(templateData.rows);
        const statusArray = new Array(templateData.rows.length).fill(null);
        setValidationStatus(statusArray);
        const activeRowsSet = new Set();
        for (let i = 0; i < templateData.rows.length; i++) {
          activeRowsSet.add(i);
        }
        setActiveRows(activeRowsSet);
        console.log('✅ Loaded initial data rows:', templateData.rows.length);
      } else {
        // Empty template
        setData([]);
        setValidationStatus([]);
        setActiveRows(new Set());
        console.log('📋 Empty template - no initial data');
      }
    } else {
      // Blank workbook - create default 10 columns × 100 rows
      console.log('📄 Blank workbook - creating default grid');
      initializeBlankSpreadsheet();
    }
  } else {
    // Fallback to default Customer Database if no workbook data
    console.log('⚠️ No workbook data - using fallback');
    initializeDefaultCustomerDatabase();
  }
};

// 🆕 NEW: Helper function to get template data if not provided
const get_template_initial_data = (template) => {
  const templates = {
    'Customer Database': {
      'columns': [
        'Name', 'Address', 'Postcode', 'Date of Birth', 'Telephone Number',
        'Email', 'Original Loan Amount', 'Regular Payment Amount',
        'Payment Frequency', 'Loan Amount Outstanding', 'Credit Card Number'
      ],
      'rows': []
    },
    'Personal Monthly Budget': {
      'columns': ['Category', 'Budgeted Amount', 'Actual Amount', 'Difference', 'Notes'],
      'rows': [
        ['Housing', '1200', '1200', '0', 'Rent and utilities'],
        ['Food', '400', '0', '400', 'Groceries and dining'],
        ['Transportation', '300', '0', '300', 'Car payment and gas']
      ]
    }
  };
  
  return templates[template] || {'columns': [], 'rows': []};
};

// 🔄 MODIFIED: useEffect to handle both new and existing workbooks
useEffect(() => {
  console.log('🐛 useEffect triggered with workbookData:', workbookData);
  
  if (workbookData) {
    console.log('🔍 Workbook data received:', { 
      name: workbookData.name, 
      template: workbookData.template,
      isNew: workbookData.isNew 
    });

    if (workbookData.isNew) {
      console.log('🆕 New workbook - loading template');
      initializeFromTemplate();
    } else {
      console.log('📂 Existing workbook - loading current data');
      loadCurrentWorkbookData();
    }
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

  // Initialize blank spreadsheet with 10 columns × 100 rows
  const initializeBlankSpreadsheet = () => {
    // Create 10 columns (A through J)
    const blankColumns = [];
    for (let i = 0; i < 10; i++) {
      const columnId = String.fromCharCode(65 + i); // A, B, C, D, E, F, G, H, I, J
      blankColumns.push({
        id: columnId,
        name: `Column ${columnId}`,
        type: 'text',
        width: 120,
        sensitivity: 'Standard',
        required: false,
        validation: 'text'
      });
    }

    // Create 100 empty rows
    const emptyRows = [];
    const activeRowsSet = new Set();
    for (let i = 0; i < 100; i++) {
      emptyRows.push(new Array(10).fill(''));
      activeRowsSet.add(i);
    }

    setColumns(blankColumns);
    setData(emptyRows);
    setValidationStatus(new Array(100).fill(null));
    setActiveRows(activeRowsSet);
    
    console.log('📊 Created blank spreadsheet: 10 columns × 100 rows');
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
    console.log('🔧 Initialized default Customer Database');
  };

  // 🎯 MAIN PYTHON BACKEND INTEGRATION FUNCTION
  const triggerPythonFunction = async (rowIndex, rowData, action = 'update') => {
    console.log(`🚀 Triggering Python function for row ${rowIndex}`);
    
    try {
      setLoading(true);
      
      // Prepare data
      const dynamicRowData = {};
      rowData.forEach((value, index) => {
        const column = columns[index];
        if (column && column.type !== 'action' && column.type !== 'status') {
          const fieldName = column.name.toLowerCase().replace(/\s+/g, '_');
          if (column.type === 'number' && value) {
            dynamicRowData[fieldName] = parseFloat(value) || 0;
          } else {
            dynamicRowData[fieldName] = value || '';
          }
        }
      });
  
      const requestData = {
        spreadsheet_id: workbookData?.name || 'unknown-workbook',
        row_index: rowIndex,
        row_data: dynamicRowData,
        user_id: 'current-user',
        action_type: action,
        timestamp: new Date().toISOString()
      };
      
      console.log('📤 Sending to backend:', requestData);
      
      const workbookName = workbookData?.name || 'unknown';
      const result = await backendService.post(`/api/workbook/${encodeURIComponent(workbookName)}/row-updated`, requestData);
      
      console.log('📥 Backend response:', result);
      
      // Update UI with results
      handlePythonResponse(rowIndex, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to trigger Python function:', error);
      setValidationMessage(`❌ Backend error: ${error.message}`);
      setShowValidationPopup(true);
      setTimeout(() => setShowValidationPopup(false), 4000);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handle response from Python backend
  const handlePythonResponse = (rowIndex, pythonResult) => {
    console.log(`🎯 Processing Python results for row ${rowIndex}:`, pythonResult);
    
    // Store Git hash
    if (pythonResult.git_hash) {
      setGitHashes(prev => ({
        ...prev,
        [rowIndex]: pythonResult.git_hash
      }));
      console.log(`🔐 Git hash for row ${rowIndex}: ${pythonResult.git_hash.substring(0, 12)}...`);
    }
    
    // Store business actions
    if (pythonResult.business_actions && pythonResult.business_actions.length > 0) {
      setBusinessActions(prev => ({
        ...prev,
        [rowIndex]: pythonResult.business_actions
      }));
      
      // Show business action notifications
      pythonResult.business_actions.forEach(action => {
        showBusinessActionNotification(action, rowIndex);
      });
    }
    
    // Show success message
    const gitHashShort = pythonResult.git_hash?.substring(0, 8) || 'none';
    setValidationMessage(`✅ ${pythonResult.message} (Git: ${gitHashShort})`);
    setShowValidationPopup(true);
    setTimeout(() => setShowValidationPopup(false), 3000);
  };

  // NEW: Fetch enhanced row history
  const fetchRowHistory = async (rowIndex) => {
    try {
      const workbookName = workbookData?.name || 'unknown';
      const result = await backendService.get(`/api/workbook/${encodeURIComponent(workbookName)}/row-history/${rowIndex}`);
      
      if (result.success) {
        return result.history;
      }
      console.error('❌ Row history fetch failed:', result);
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch row history:', error);
      return [];
    }
  };
  

  // Show notifications for business actions triggered by Python
  const showBusinessActionNotification = (action, rowIndex) => {
    let message = '';
    
    switch (action.type) {
      case 'manager_approval':
        message = `🏦 ${action.message}`;
        break;
      case 'credit_check':
        message = `📊 Credit Score: ${action.credit_score} (${action.status})`;
        break;
      case 'duplicate_warning':
        message = `⚠️ ${action.message}`;
        break;
      case 'document_generation':
        message = `📄 Document generated: ${action.document_id}`;
        break;
      case 'crm_sync':
        message = `🔗 Synced to CRM: ${action.crm_id}`;
        break;
      default:
        message = `🔧 ${action.type}: ${action.status}`;
    }
    
    console.log(`📢 Business Action Notification for row ${rowIndex}:`, message);
    
    // Show notification
    setValidationMessage(message);
    setShowValidationPopup(true);
    setTimeout(() => setShowValidationPopup(false), 4000);
  };

  // Configuration data
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

  // Validation functions
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

  const getRowHistory = (rowIndex) => {
    const history = [];
    const businessActionsList = businessActions[rowIndex] || [];
    
    // Add current version first
    history.push({
      version: 'Current',
      field: 'Row State',
      oldValue: null,
      newValue: 'Latest changes',
      author: 'current-user',
      timestamp: 'Just now'
    });
    
    // Add previous versions with negative numbering
    businessActionsList.forEach((action, index) => {
      history.push({
        version: `Version -${index + 1}`,
        field: 'Business Action',
        oldValue: null,
        newValue: `${action.type}: ${action.message || action.status}`,
        author: 'System',
        timestamp: action.timestamp || 'just now'
      });
    });
    
    return history;
  };

  // Event handlers
  const handleDoubleClick = useCallback((rowIndex, colIndex) => {
    const column = columns[colIndex];
    if (column && (column.type === 'action' || column.type === 'status')) return;
    
    setEditingCell(`${rowIndex}-${colIndex}`);
    setEditValue(String(data[rowIndex]?.[colIndex] || ''));
  }, [columns, data]);

// 🆕 ADD THIS NEW FUNCTION
const saveCurrentCell = async (rowIndex, colIndex) => {
  try {
    // Validate field first (frontend validation)
    const column = columns[colIndex];
    const validation = validateField(editValue, column, rowIndex);
    
    if (validation.errors.length > 0) {
      // Show validation errors
      const errorMsg = validation.errors.join(', ');
      const suggestionMsg = validation.suggestions.length > 0 ? 
        ` | Correct format: ${validation.suggestions.join(', ')}` : '';
      setValidationMessage(`❌ ${errorMsg}${suggestionMsg}`);
      setShowValidationPopup(true);
      setTimeout(() => setShowValidationPopup(false), 5000);
      return false; // Validation failed
    }
    
    // Update local state IMMEDIATELY for responsive UI
    const newData = [...data];
    newData[rowIndex] = newData[rowIndex] || [];
    newData[rowIndex][colIndex] = editValue;
    setData(newData);
    
    // Mark row as having pending changes (immediate UI feedback)
    const newPendingChanges = new Set(pendingChanges);
    newPendingChanges.add(rowIndex);
    setPendingChanges(newPendingChanges);
    
    // 🚀 NEW: DEBOUNCED SAVE - Don't spam the backend
    const changeKey = `${rowIndex}-${colIndex}`;
    pendingChangesRef.current.set(changeKey, {
      rowIndex,
      colIndex,
      value: editValue,
      rowData: newData[rowIndex]
    });

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout - save after user stops typing
    saveTimeoutRef.current = setTimeout(async () => {
      await flushPendingChanges();
    }, 500); // Wait 500ms after user stops typing

    return true; // Save queued successfully
    
  } catch (error) {
    console.error('Error in cell update:', error);
    return false;
  }
};

const flushPendingChanges = async () => {
  const changes = Array.from(pendingChangesRef.current.values());
  pendingChangesRef.current.clear();

  if (changes.length === 0) return;

  try {
    console.log(`🚀 Saving ${changes.length} debounced changes...`);

    if (changes.length === 1) {
      // Single change - use existing backend endpoint
      const change = changes[0];
      await triggerPythonFunction(change.rowIndex, change.rowData, 'cell_update');
    } else {
      // Multiple changes - batch them for efficiency
      await batchSaveChanges(changes);
    }

    console.log(`✅ Successfully saved ${changes.length} changes`);
    
  } catch (error) {
    console.error('❌ Failed to save changes:', error);
    setValidationMessage(`❌ Failed to save changes: ${error.message}`);
    setShowValidationPopup(true);
    setTimeout(() => setShowValidationPopup(false), 4000);
  }
};

const batchSaveChanges = async (changes) => {
  try {
    // Group changes by row to avoid duplicate saves
    const rowGroups = {};
    changes.forEach(change => {
      rowGroups[change.rowIndex] = change.rowData;
    });

    // Save each unique row
    const savePromises = Object.entries(rowGroups).map(([rowIndex, rowData]) => 
      triggerPythonFunction(parseInt(rowIndex), rowData, 'batch_update')
    );

    await Promise.all(savePromises);
    console.log(`✅ Batch saved changes for ${Object.keys(rowGroups).length} rows`);
    
  } catch (error) {
    console.error('❌ Batch save failed:', error);
    throw error;
  }
};



  // 🎯 TRIGGER POINT 1: When user finishes editing a cell
  const handleKeyPress = async (e, rowIndex, colIndex) => {
    if (e.key === 'Enter') {
      const saved = await saveCurrentCell(rowIndex, colIndex); // Uses debounced version
      if (saved) {
        setEditingCell(null);
        setEditValue('');
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const saved = await saveCurrentCell(rowIndex, colIndex); // Uses debounced version
      if (saved) {
        setEditingCell(null);
        setEditValue('');
        // Move to next cell - skip action/status columns
        let nextColIndex = colIndex + 1;
        while (nextColIndex < columns.length) {
          const nextColumn = columns[nextColIndex];
          if (nextColumn && nextColumn.type !== 'action' && nextColumn.type !== 'status') {
            setSelectedCell(`${rowIndex}-${nextColIndex}`);
            setEditingCell(`${rowIndex}-${nextColIndex}`);
            setEditValue(String(data[rowIndex]?.[nextColIndex] || ''));
            break;
          }
          nextColIndex++;
        }
      }
    }
  };

  // 🎯 TRIGGER POINT 2: When user sends row for validation
  const sendForValidation = async (rowIndex) => {
    try {
      console.log(`📧 Sending row ${rowIndex} for validation`);
      
      // 🚀 TRIGGER PYTHON FUNCTION with specific action
      const result = await triggerPythonFunction(rowIndex, data[rowIndex], 'send_validation');
      
      // Update validation status
      const newValidationStatus = [...validationStatus];
      newValidationStatus[rowIndex] = false; // pending
      setValidationStatus(newValidationStatus);
      
      // Remove from pending changes
      const newPendingChanges = new Set(pendingChanges);
      newPendingChanges.delete(rowIndex);
      setPendingChanges(newPendingChanges);
      
      // Show email notification
      const customerName = data[rowIndex][0];
      const customerEmail = data[rowIndex][5];
      
      setEmailDetails({
        customer: customerName,
        email: customerEmail,
        change: `Validation sent (Git: ${result.git_hash?.substring(0, 8)})`
      });
      setShowEmailPopup(true);
      setTimeout(() => setShowEmailPopup(false), 4000);
      
    } catch (error) {
      console.error('Failed to send validation:', error);
    }
  };

  const simulateCustomerApproval = (rowIndex) => {
    const newValidationStatus = [...validationStatus];
    newValidationStatus[rowIndex] = true;
    setValidationStatus(newValidationStatus);
  };

  // 🎯 TRIGGER POINT 3: When user activates a new row
  const activateRow = async (rowIndex) => {
    console.log(`➕ Activating new row ${rowIndex}`);
    
    const newActiveRows = new Set(activeRows);
    newActiveRows.add(rowIndex);
    setActiveRows(newActiveRows);
    
    // Create empty row data
    const emptyRowData = new Array(Math.max(1, columns.length - 2)).fill('');
    
    const newData = [...data];
    while (newData.length <= rowIndex) {
      newData.push(emptyRowData);
    }
    setData(newData);
    
    // Initialize validation status
    const newValidationStatus = [...validationStatus];
    while (newValidationStatus.length <= rowIndex) {
      newValidationStatus.push(null);
    }
    setValidationStatus(newValidationStatus);
    
    // 🚀 TRIGGER PYTHON FUNCTION for row creation
    try {
      await triggerPythonFunction(rowIndex, emptyRowData, 'row_created');
    } catch (error) {
      console.error('Failed to register row creation:', error);
    }
  };

  // Add new column function
  const addNewColumn = async () => {
    try {
      // 1. Create new column
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
      
      // 2. Update local state
      const updatedColumns = [...columns, newColumn];
      setColumns(updatedColumns);
      console.log('➕ Added new column locally:', newColumn.name);

      // 3. 🆕 SAVE TO BACKEND - This was missing!
      const workbookName = workbookData?.name || 'unknown';
      const saveResult = await backendService.post(`/api/workbook/${encodeURIComponent(workbookName)}/save-columns`, {
        columns: updatedColumns,  // Save ALL columns including the new one
        user_email: 'frontend@user.com'
      });

      if (saveResult.success) {
        console.log('✅ New column saved to backend:', saveResult.git_hash?.substring(0, 8));
        
        // 4. Show success message
        setValidationMessage(`✅ Added column "${newColumn.name}" (Git: ${saveResult.git_hash?.substring(0, 8) || 'none'})`);
        setShowValidationPopup(true);
        setTimeout(() => setShowValidationPopup(false), 3000);
      } else {
        // If backend save fails, revert local state
        setColumns(columns);
        throw new Error(saveResult.message || 'Failed to save new column');
      }

      // 5. Open configuration dialog for the new column
      openColumnConfig(newColumn);
      
    } catch (error) {
      console.error('❌ Failed to add new column:', error);
      setValidationMessage(`❌ Failed to add column: ${error.message}`);
      setShowValidationPopup(true);
      setTimeout(() => setShowValidationPopup(false), 5000);
    }
  };

  // Open column configuration
  const openColumnConfig = (column) => {
    setActiveColumn(column);
    setColumnConfigForm({
      name: column.name,
      type: column.type,
      sensitivity: column.sensitivity
    });
    setShowColumnConfig(true);
  };

  // 🔧 FIXED: Update column configuration with backend save
  const updateColumnConfig = async () => {
    if (!activeColumn) return;

    try {
      // 1. Update local state
      const updatedColumns = columns.map(col => {
        if (col.id === activeColumn.id) {
          return {
            ...col,
            name: columnConfigForm.name || col.name,
            type: columnConfigForm.type,
            sensitivity: columnConfigForm.sensitivity
          };
        }
        return col;
      });

      setColumns(updatedColumns);
      console.log('📊 Updated columns locally:', updatedColumns.map(c => c.name));

      // 2. 🆕 SAVE TO BACKEND - This was missing!
      const workbookName = workbookData?.name || 'unknown';
      const saveResult = await backendService.post(`/api/workbook/${encodeURIComponent(workbookName)}/save-columns`, {
        columns: updatedColumns,  // Save ALL columns, not just the changed one
        user_email: 'frontend@user.com'
      });

      if (saveResult.success) {
        console.log('✅ Column config saved to backend:', saveResult.git_hash?.substring(0, 8));
        
        // 3. Show success message with Git hash
        setValidationMessage(`✅ Column "${columnConfigForm.name}" updated successfully (Git: ${saveResult.git_hash?.substring(0, 8) || 'none'})`);
        setShowValidationPopup(true);
        setTimeout(() => setShowValidationPopup(false), 3000);
      } else {
        throw new Error(saveResult.message || 'Failed to save column config');
      }

      // 4. Close dialog
      setShowColumnConfig(false);
      setActiveColumn(null);
      
    } catch (error) {
      console.error('❌ Failed to update column config:', error);
      setValidationMessage(`❌ Failed to save column config: ${error.message}`);
      setShowValidationPopup(true);
      setTimeout(() => setShowValidationPopup(false), 5000);
    }
  };

  // Version history data
  const versionHistory = [
    { 
      id: 'v1.1', 
      author: 'System', 
      timestamp: 'Just now', 
      changes: `Created workbook: ${workbookData?.name || 'New Workbook'}`, 
      type: 'create' 
    }
  ];

  const collaborators = [
    { name: 'Current User', status: 'editing', avatar: 'CU' }
  ];

  // Render cell with Git information
  const renderCellWithGitInfo = (rowIndex, colIndex, cellContent) => {
    const gitHash = gitHashes[rowIndex];
    const actions = businessActions[rowIndex] || [];
    
    return (
      <div className="relative">
        {cellContent}
        
        {/* Git hash indicator */}
        {gitHash && (
          <div className="absolute -top-1 -right-1">
            <span 
              className="inline-block w-2 h-2 bg-green-400 rounded-full"
              title={`Git: ${gitHash.substring(0, 12)}... (${actions.length} actions)`}
            />
          </div>
        )}
        
        {/* Business action indicators */}
        {actions.some(a => a.type === 'manager_approval') && (
          <div className="absolute top-0 left-0">
            <span className="text-orange-500 text-xs">🏦</span>
          </div>
        )}
        
        {actions.some(a => a.type === 'duplicate_warning') && (
          <div className="absolute top-0 left-2">
            <span className="text-red-500 text-xs">⚠️</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Processing with Python backend...</span>
          </div>
        </div>
      )}

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
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-500">Self-Contained Backend ✅</span>
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
              onClick={() => console.log('Git hashes:', gitHashes, 'Business actions:', businessActions)}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-100 hover:bg-green-200 rounded-md"
              title="View Git hashes and business actions"
            >
              <span>🔐</span>
              <span>Git Info</span>
            </button>

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
                  onClick={() => {
                    setShowColumnConfig(false);
                    setActiveColumn(null);
                  }}
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
                    value={columnConfigForm.name}
                    onChange={(e) => setColumnConfigForm(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter column name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Data Type</label>
                  <select 
                    value={columnConfigForm.type}
                    onChange={(e) => setColumnConfigForm(prev => ({...prev, type: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dataTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Sensitivity Level</label>
                  <select 
                    value={columnConfigForm.sensitivity}
                    onChange={(e) => setColumnConfigForm(prev => ({...prev, sensitivity: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {sensitivityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={updateColumnConfig}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  Update Column
                </button>
              </div>
            </div>
          )}

          {/* Empty State for Truly Empty Workbooks (shouldn't happen now) */}
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
            <VirtualizedTable
            data={data}
            columns={columns}
            onCellEdit={handleDoubleClick}
            editingCell={editingCell}
            editValue={editValue}
            setEditValue={setEditValue}
            onKeyPress={handleKeyPress}
            selectedCell={selectedCell}
            setSelectedCell={setSelectedCell}
            validationStatus={validationStatus}
            pendingChanges={pendingChanges}
            businessActions={businessActions}
            gitHashes={gitHashes}
            sendForValidation={sendForValidation}
            simulateCustomerApproval={simulateCustomerApproval}
            getCustomerValidationStatus={getCustomerValidationStatus}
            maskCreditCard={maskCreditCard}
            fetchRowHistory={fetchRowHistory}
            selectedRowHistory={selectedRowHistory}
            setSelectedRowHistory={setSelectedRowHistory}
            getRowHistory={getRowHistory}
          />
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
              <h4 className="font-medium text-sm mb-2 text-gray-900">Backend Response</h4>
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

