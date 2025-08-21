"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const HistoryTable_1 = __importDefault(require("@/components/HistoryTable/HistoryTable"));
const github_1 = require("@/api/github");
require("./History.css");
// Mock runs data - in real app, this would be fetched based on actionId
const mockRuns = [
    {
        id: '1234',
        status: 'completed',
        conclusion: 'success',
        timestamp: '2025-08-15 12:00:34',
        reason: 'Build completed successfully',
        branch: 'main',
    },
    {
        id: '1235',
        status: 'completed',
        conclusion: 'failure',
        timestamp: '2025-08-15 11:45:22',
        reason: 'Compile Error: Syntax error in line 45',
        branch: 'develop',
    },
    {
        id: '1236',
        status: 'completed',
        conclusion: 'success',
        timestamp: '2025-08-15 11:30:15',
        reason: 'All tests passed',
        branch: 'feature/new-ui',
    },
    {
        id: '1237',
        status: 'completed',
        conclusion: 'failure',
        timestamp: '2025-08-15 11:15:08',
        reason: 'Test failure: 3 tests failed',
        branch: 'main',
    },
    {
        id: '1238',
        status: 'completed',
        conclusion: 'success',
        timestamp: '2025-08-15 11:00:42',
        reason: 'Deployment successful',
        branch: 'staging',
    },
    {
        id: '1239',
        status: 'completed',
        conclusion: 'failure',
        timestamp: '2025-08-15 10:45:33',
        reason: 'Dependency resolution failed',
        branch: 'develop',
    },
    {
        id: '1240',
        status: 'completed',
        conclusion: 'success',
        timestamp: '2025-08-15 10:30:18',
        reason: 'Code quality checks passed',
        branch: 'main',
    },
    {
        id: '1241',
        status: 'completed',
        conclusion: 'failure',
        timestamp: '2025-08-15 10:15:55',
        reason: 'Build timeout after 30 minutes',
        branch: 'feature/performance',
    },
];
const HistoryPage = ({ actionId, isSidebarOpen }) => {
    const [runHistory, setRunHistory] = (0, react_1.useState)(mockRuns);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // API를 통해 실제 run history를 가져옴
        if (actionId) {
            setIsLoading(true);
            (0, github_1.getRunHistory)(actionId)
                .then(runs => {
                setRunHistory(runs);
            })
                .catch(error => {
                console.error('Failed to fetch run history:', error);
                // 에러 발생 시 mock 데이터 사용
                setRunHistory(mockRuns);
            })
                .finally(() => {
                setIsLoading(false);
            });
        }
    }, [actionId]);
    if (!actionId) {
        return (<div className={`history-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="history-main">
          <div className="main-header">
            <h1 className="main-title">Workflow Run History</h1>
          </div>
          <div className="history-editor">
            <div className="history-empty-state">
              <p className="text-muted">워크플로우를 선택해주세요.</p>
            </div>
          </div>
        </div>
      </div>);
    }
    return (<div className={`history-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Central History Section */}
      <div className="history-main">
        {/* Main Header */}
        <div className="main-header">
          <h1 className="main-title">Workflow Run History</h1>
        </div>

        {/* History Editor */}
        <div className="history-editor">
          {isLoading ? (<div className="history-loading">
              <p className="text-muted">로딩 중...</p>
            </div>) : (<HistoryTable_1.default runs={runHistory} isSidebarOpen={isSidebarOpen}/>)}
        </div>
      </div>
    </div>);
};
exports.default = HistoryPage;
