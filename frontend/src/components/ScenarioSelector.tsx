import { useEffect, useState } from 'react'
import { Scenario, Node } from '../types'
import { fetchScenarios, startSession } from '../services/api'
import {
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
  Alert,
  Button
} from '@mui/material'
import DecisionTree from './DecisionTree'

const sortScenarios = (list: Scenario[]): Scenario[] => {
  return [...list].sort((a, b) => {
    const ie46 = (n: string) => /ИЭ-46/i.test(n)
    if (ie46(a.name) !== ie46(b.name)) return ie46(b.name) ? 1 : -1
    return a.name.localeCompare(b.name, 'ru')
  })
}

const ScenarioSelector = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selected, setSelected] = useState<number>()
  const [rootNode, setRootNode] = useState<Node>()
  const [sessionId, setSessionId] = useState<number>()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoadError(null)
      setLoading(true)
      try {
        for (let attempt = 0; attempt < 5; attempt++) {
          if (cancelled) return
          const list = await fetchScenarios()
          const sorted = sortScenarios(list)
          setScenarios(sorted)
          if (sorted.length > 0) break
          await new Promise((r) => setTimeout(r, 350 + attempt * 150))
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message?: string }).message)
              : 'Не удалось загрузить сценарии'
          setLoadError(
            `${msg}. Проверьте, что API запущен (http://localhost:8000) и вы вошли как оператор.`
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    const onVis = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const handleChange = async (scenarioId: number) => {
    setSelected(scenarioId)
    const { session_id, current_node } = await startSession(scenarioId)
    setSessionId(session_id)
    setRootNode(current_node)
  }

  return (
    <Box sx={{ padding: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper sx={{ padding: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Система поддержки принятия решений
        </Typography>

        <Typography variant="subtitle1" gutterBottom>
          Выберите сценарий аварийной ситуации:
        </Typography>

        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }} action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Обновить
            </Button>
          }>
            {loadError}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {loading
            ? 'Загрузка списка сценариев…'
            : `Доступно сценариев: ${scenarios.length}`}
        </Typography>

        <Select
          fullWidth
          displayEmpty
          value={selected ?? ''}
          onChange={(e) => handleChange(Number(e.target.value))}
          disabled={loading || scenarios.length === 0}
        >
          <MenuItem value="" disabled>
            {scenarios.length === 0 && !loading
              ? 'Нет сценариев — проверьте API и /health/db'
              : 'Выберите сценарий'}
          </MenuItem>
          {scenarios.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </Select>
      </Paper>

      {rootNode && sessionId && (
        <DecisionTree rootNode={rootNode} sessionId={sessionId} />
      )}
    </Box>
  )
}

export default ScenarioSelector