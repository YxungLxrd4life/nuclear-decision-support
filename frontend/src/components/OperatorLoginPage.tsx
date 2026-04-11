import { useState } from 'react'
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../store'
import { setToken } from '../store'
import { login } from '../services/api'

const OperatorLoginPage = () => {
  const [username, setUsername] = useState('operator')
  const [password, setPassword] = useState('operator123')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // #region agent log
    fetch('http://127.0.0.1:7634/ingest/aa3d791d-3b23-46fa-8bfc-b10720f1076d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a8db46'},body:JSON.stringify({sessionId:'a8db46',runId:'pre-fix',hypothesisId:'H1',location:'OperatorLoginPage.tsx:handleSubmit:start',message:'Operator submit started',data:{usernameEntered:username.length>0,targetRoute:'/operator'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      const token = await login(username, password)
      // #region agent log
      fetch('http://127.0.0.1:7634/ingest/aa3d791d-3b23-46fa-8bfc-b10720f1076d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a8db46'},body:JSON.stringify({sessionId:'a8db46',runId:'pre-fix',hypothesisId:'H2',location:'OperatorLoginPage.tsx:handleSubmit:afterLogin',message:'Operator login success before dispatch',data:{hasToken:Boolean(token),tokenLength:token?.length??0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      dispatch(setToken(token))
      // #region agent log
      fetch('http://127.0.0.1:7634/ingest/aa3d791d-3b23-46fa-8bfc-b10720f1076d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a8db46'},body:JSON.stringify({sessionId:'a8db46',runId:'pre-fix',hypothesisId:'H3',location:'OperatorLoginPage.tsx:handleSubmit:afterDispatch',message:'Token dispatched, navigating to operator',data:{navigateTo:'/operator'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      navigate('/operator')
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7634/ingest/aa3d791d-3b23-46fa-8bfc-b10720f1076d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a8db46'},body:JSON.stringify({sessionId:'a8db46',runId:'pre-fix',hypothesisId:'H1',location:'OperatorLoginPage.tsx:handleSubmit:catch',message:'Operator login failed in submit handler',data:{errorType:(error as Error)?.name??'unknown'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setError('Неверный логин или пароль')
    }
  }

  return (
    <Box sx={{ padding: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper sx={{ padding: 4, maxWidth: 400, margin: '0 auto', mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          Вход оператора
        </Typography>
        <Typography variant="body2" gutterBottom>
          Тестовый оператор: operator / operator123
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
          />
          <TextField
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained">
            Войти
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default OperatorLoginPage

