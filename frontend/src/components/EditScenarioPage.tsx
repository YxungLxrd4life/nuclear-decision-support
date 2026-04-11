import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material'
import { fetchScenario, updateScenario } from '../services/api'

const EditScenarioPage = () => {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!scenarioId) {
      setError('Не найден id сценария')
      return
    }

    const loadScenario = async () => {
      try {
        const scenario = await fetchScenario(Number(scenarioId))
        setName(scenario.name)
        setDescription(scenario.description ?? '')
      } catch {
        setError('Не удалось загрузить сценарий')
      }
    }

    loadScenario()
  }, [scenarioId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!scenarioId || !name.trim()) return

    setIsSaving(true)
    try {
      await updateScenario(Number(scenarioId), { name, description })
      navigate('/admin')
    } catch {
      setError('Не удалось сохранить изменения')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box sx={{ padding: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper sx={{ padding: 3, maxWidth: 800, margin: '0 auto' }}>
        <Typography variant="h4" gutterBottom>
          Редактирование сценария
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSave}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="Название сценария"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={4}
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button type="submit" variant="contained" disabled={isSaving}>
              Сохранить
            </Button>
            <Button variant="outlined" onClick={() => navigate('/admin')} disabled={isSaving}>
              Отмена
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

export default EditScenarioPage
