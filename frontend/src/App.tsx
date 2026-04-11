import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'
import { useSelector } from 'react-redux'
import type { RootState } from './store'
import ScenarioSelector from './components/ScenarioSelector'
import AdminPanel from './components/AdminPanel'
import OperatorLoginPage from './components/OperatorLoginPage'
import AdminLoginPage from './components/AdminLoginPage'
import EditScenarioPage from './components/EditScenarioPage'

const OperatorRoute = ({ children }: { children: JSX.Element }) => {
  const token = useSelector((state: RootState) => state.auth.token)
  // #region agent log
  fetch('http://127.0.0.1:7634/ingest/aa3d791d-3b23-46fa-8bfc-b10720f1076d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a8db46'},body:JSON.stringify({sessionId:'a8db46',runId:'pre-fix',hypothesisId:'H3',location:'App.tsx:OperatorRoute',message:'Operator route guard check',data:{hasToken:Boolean(token),currentPath:window.location.pathname},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!token) {
    return <Navigate to="/login-operator" replace />
  }
  return children
}

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const token = useSelector((state: RootState) => state.auth.token)
  if (!token) {
    return <Navigate to="/login-admin" replace />
  }
  return children
}

function App() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            СППР для БЩУ АЭС
          </Typography>
          <Button color="inherit" component={Link} to="/login-operator">
            Вход оператора
          </Button>
          <Button color="inherit" component={Link} to="/login-admin">
            Вход администратора
          </Button>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/login-operator" element={<OperatorLoginPage />} />
        <Route path="/login-admin" element={<AdminLoginPage />} />
        <Route
          path="/operator"
          element={
            <OperatorRoute>
              <ScenarioSelector />
            </OperatorRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/scenarios/:scenarioId/edit"
          element={
            <AdminRoute>
              <EditScenarioPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login-operator" replace />} />
      </Routes>
    </Box>
  )
}

export default App