import Editor from './pages/Editor/Editor'
import './styles/theme.css'

function App() {
  // 임시로 actionId를 설정하여 Editor가 제대로 표시되도록 함
  const mockActionId = 'test-action-123'
  
  console.log('App 렌더링됨, mockActionId:', mockActionId)
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: '#0d1117',
      color: 'white',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      fontFamily: 'var(--font-family-base)',
      // 전체 스크롤 완전 차단
      overscrollBehavior: 'none',
      WebkitOverflowScrolling: 'touch',
      // 화면 움직임 방지
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      // 가로 스크롤 완전 차단
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      <Editor actionId={mockActionId} />
    </div>
  )
}

export default App
