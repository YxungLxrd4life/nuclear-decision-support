import { useState } from 'react'
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../store'
import { setToken } from '../store'
import { login } from '../services/api'

const LoginPage = () => {
  const [username, setUsername] = useState('operator')
  const [password, setPassword] = useState('operator123')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const token = await login(username, password)
      dispatch(setToken(token))
      navigate('/operator')
    } catch (err) {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <Box sx={{ padding: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper sx={{ padding: 4, maxWidth: 400, margin: '0 auto', mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          Вход в систему СППР
        </Typography>
        <Typography variant="body2" gutterBottom>
          Тестовый пользователь: operator / operator123
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

export default LoginPage

