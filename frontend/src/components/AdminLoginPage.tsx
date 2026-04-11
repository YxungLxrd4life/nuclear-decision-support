import { useState } from 'react'
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../store'
import { setToken } from '../store'
import { login } from '../services/api'

const AdminLoginPage = () => {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const token = await login(username, password)
      dispatch(setToken(token))
      navigate('/admin')
    } catch {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <Box sx={{ padding: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper sx={{ padding: 4, maxWidth: 400, margin: '0 auto', mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          Вход администратора
        </Typography>
        <Typography variant="body2" gutterBottom>
          Тестовый админ: admin / admin123
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

export default AdminLoginPage

