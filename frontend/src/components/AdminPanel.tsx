import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Tabs,
  Tab
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { Scenario } from '../types'
import {
  fetchScenarios,
  createScenarioWithNodes,
  deleteScenario,
  ScenarioWithNodesCreate,
  ScenarioNodeDraft,
  fetchOperatorLogs,
  OperatorActionLog
} from '../services/api'

type BuilderAnswer = {
  text: string
  next_node_key: string
}

type BuilderNode = {
  key: string
  question: string
  is_final: boolean
  final_action: string
  answers: BuilderAnswer[]
}

const createEmptyNode = (index: number): BuilderNode => ({
  key: `node_${index}`,
  question: '',
  is_final: false,
  final_action: '',
  answers: [{ text: 'Да', next_node_key: '' }, { text: 'Нет', next_node_key: '' }]
})

const AdminPanel = () => {
  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scenarioJson, setScenarioJson] = useState('')
  const [rootNodeKey, setRootNodeKey] = useState('start')
  const [builderNodes, setBuilderNodes] = useState<BuilderNode[]>([
    { ...createEmptyNode(1), key: 'start' }
  ])
  const [createMode, setCreateMode] = useState<'basic' | 'json'>('basic')
  const [operatorLogs, setOperatorLogs] = useState<OperatorActionLog[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchScenarios().then(setScenarios)
    fetchOperatorLogs().then(setOperatorLogs).catch(() => {})
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return
    try {
      let created: Scenario
      if (createMode === 'json') {
        const payload = JSON.parse(scenarioJson) as Omit<ScenarioWithNodesCreate, 'name' | 'description'>
        created = await createScenarioWithNodes({
          name,
          description,
          root_node_key: payload.root_node_key,
          nodes: payload.nodes
        })
      } else {
        if (builderNodes.length === 0) {
          setError('Добавьте хотя бы один узел дерева')
          return
        }
        const keys = builderNodes.map((n) => n.key.trim())
        if (keys.some((k) => !k)) {
          setError('У каждого узла должен быть ключ')
          return
        }
        if (new Set(keys).size !== keys.length) {
          setError('Ключи узлов должны быть уникальными')
          return
        }
        if (!keys.includes(rootNodeKey)) {
          setError('Выберите корректный корневой узел')
          return
        }

        const keySet = new Set(keys)
        for (const node of builderNodes) {
          if (!node.question.trim()) {
            setError(`Заполните текст вопроса для узла "${node.key}"`)
            return
          }
          if (node.is_final) {
            if (!node.final_action.trim()) {
              setError(`Заполните финальное действие для узла "${node.key}"`)
              return
            }
            continue
          }
          if (node.answers.length === 0) {
            setError(`Добавьте ответы для узла "${node.key}"`)
            return
          }
          for (const answer of node.answers) {
            if (!answer.text.trim()) {
              setError(`Заполните текст ответа в узле "${node.key}"`)
              return
            }
            if (!answer.next_node_key || !keySet.has(answer.next_node_key)) {
              setError(`Укажите корректный переход ответа в узле "${node.key}"`)
              return
            }
          }
        }

        const nodesPayload: ScenarioNodeDraft[] = builderNodes.map((node) => ({
          key: node.key.trim(),
          question: node.question.trim(),
          is_final: node.is_final,
          final_action: node.is_final ? node.final_action.trim() : undefined,
          answers: node.is_final
            ? []
            : node.answers.map((answer) => ({
                text: answer.text.trim(),
                next_node_key: answer.next_node_key
              }))
        }))

        created = await createScenarioWithNodes({
          name,
          description,
          root_node_key: rootNodeKey,
          nodes: nodesPayload
        })
      }
      setScenarios((prev) => [...prev, created])
      setName('')
      setDescription('')
      if (createMode === 'json') {
        setScenarioJson('')
      } else {
        setRootNodeKey('start')
        setBuilderNodes([{ ...createEmptyNode(1), key: 'start' }])
      }
    } catch (error: any) {
      const backendDetail = error?.response?.data?.detail
      if (typeof backendDetail === 'string' && backendDetail.trim()) {
        setError(backendDetail)
        return
      }
      if (createMode === 'json') {
        setError('Не удалось создать сценарий. Проверьте JSON структуры сценария.')
      } else {
        setError('Не удалось создать сценарий')
      }
    }
  }

  const handleDelete = async (scenarioId: number) => {
    setError(null)
    try {
      await deleteScenario(scenarioId)
      setScenarios((prev) => prev.filter((scenario) => scenario.id !== scenarioId))
    } catch {
      setError('Не удалось удалить сценарий')
    }
  }

  const handleOpenExistingByName = () => {
    setError(null)
    const normalizedName = name.trim().toLowerCase()
    if (!normalizedName) return

    const existingScenario = scenarios.find(
      (scenario) => scenario.name.trim().toLowerCase() === normalizedName
    )

    if (!existingScenario) {
      setError('Сценария с таким названием не существует')
      return
    }

    navigate(`/admin/scenarios/${existingScenario.id}/edit`)
  }

  const updateNode = (index: number, patch: Partial<BuilderNode>) => {
    setBuilderNodes((prev) =>
      prev.map((node, idx) => (idx === index ? { ...node, ...patch } : node))
    )
  }

  const updateAnswer = (
    nodeIndex: number,
    answerIndex: number,
    patch: Partial<BuilderAnswer>
  ) => {
    setBuilderNodes((prev) =>
      prev.map((node, idx) => {
        if (idx !== nodeIndex) return node
        const answers = node.answers.map((answer, aIdx) =>
          aIdx === answerIndex ? { ...answer, ...patch } : answer
        )
        return { ...node, answers }
      })
    )
  }

  const addNode = () => {
    setBuilderNodes((prev) => [...prev, createEmptyNode(prev.length + 1)])
  }

  const removeNode = (index: number) => {
    const removedKey = builderNodes[index]?.key
    setBuilderNodes((prev) => prev.filter((_, idx) => idx !== index))
    if (removedKey === rootNodeKey) {
      setRootNodeKey('start')
    }
  }

  const addAnswer = (nodeIndex: number) => {
    setBuilderNodes((prev) =>
      prev.map((node, idx) =>
        idx === nodeIndex
          ? {
              ...node,
              answers: [...node.answers, { text: '', next_node_key: '' }]
            }
          : node
      )
    )
  }

  const removeAnswer = (nodeIndex: number, answerIndex: number) => {
    setBuilderNodes((prev) =>
      prev.map((node, idx) =>
        idx === nodeIndex
          ? {
              ...node,
              answers: node.answers.filter((_, aIdx) => aIdx !== answerIndex)
            }
          : node
      )
    )
  }

  const refreshOperatorLogs = async () => {
    try {
      const logs = await fetchOperatorLogs()
      setOperatorLogs(logs)
    } catch {
      setError('Не удалось загрузить логи операторов')
    }
  }

  return (
    <Box sx={{ padding: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper sx={{ padding: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" gutterBottom>
            Панель администратора сценариев
          </Typography>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Назад
          </Button>
        </Box>
        <Typography variant="body1" gutterBottom>
          Добавляйте и управляйте сценариями для оперативного персонала.
        </Typography>
        <Tabs
          value={createMode}
          onChange={(_, value) => setCreateMode(value)}
          sx={{ mt: 2 }}
        >
          <Tab value="basic" label="Обычное создание" />
          <Tab value="json" label="Создание по JSON" />
        </Tabs>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={handleCreate}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}
        >
          <TextField
            label="Название сценария"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
          {createMode === 'basic' && (
            <>
              <FormControl fullWidth>
                <InputLabel>Корневой узел</InputLabel>
                <Select
                  label="Корневой узел"
                  value={rootNodeKey}
                  onChange={(e) => setRootNodeKey(e.target.value)}
                >
                  {builderNodes.map((node) => (
                    <MenuItem key={node.key} value={node.key}>
                      {node.key}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {builderNodes.map((node, nodeIndex) => (
                <Paper key={`${node.key}-${nodeIndex}`} sx={{ p: 2, border: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Узел {nodeIndex + 1}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <TextField
                      label="Ключ узла"
                      value={node.key}
                      onChange={(e) => updateNode(nodeIndex, { key: e.target.value })}
                      sx={{ minWidth: 220 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={node.is_final}
                          onChange={(e) => updateNode(nodeIndex, { is_final: e.target.checked })}
                        />
                      }
                      label="Финальный узел"
                    />
                  </Box>
                  <TextField
                    label='Условие / вопрос (например: "Температура выше 200°C?")'
                    value={node.question}
                    onChange={(e) => updateNode(nodeIndex, { question: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mb: 2 }}
                  />
                  {node.is_final ? (
                    <TextField
                      label="Финальное действие"
                      value={node.final_action}
                      onChange={(e) => updateNode(nodeIndex, { final_action: e.target.value })}
                      fullWidth
                      multiline
                      rows={3}
                    />
                  ) : (
                    <>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Ответы и переходы
                      </Typography>
                      {node.answers.map((answer, answerIndex) => (
                        <Box key={answerIndex} sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                          <TextField
                            label="Текст ответа"
                            value={answer.text}
                            onChange={(e) =>
                              updateAnswer(nodeIndex, answerIndex, { text: e.target.value })
                            }
                            sx={{ flex: 1, minWidth: 200 }}
                          />
                          <FormControl sx={{ minWidth: 220 }}>
                            <InputLabel>Переход к узлу</InputLabel>
                            <Select
                              label="Переход к узлу"
                              value={answer.next_node_key}
                              onChange={(e) =>
                                updateAnswer(nodeIndex, answerIndex, {
                                  next_node_key: e.target.value
                                })
                              }
                            >
                              {builderNodes
                                .filter((n) => n.key.trim())
                                .map((n) => (
                                  <MenuItem key={n.key} value={n.key}>
                                    {n.key}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                          <Button
                            color="error"
                            variant="outlined"
                            onClick={() => removeAnswer(nodeIndex, answerIndex)}
                          >
                            Удалить ответ
                          </Button>
                        </Box>
                      ))}
                      <Button variant="outlined" onClick={() => addAnswer(nodeIndex)} sx={{ mt: 1 }}>
                        Добавить ответ
                      </Button>
                    </>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      color="error"
                      variant="text"
                      onClick={() => removeNode(nodeIndex)}
                      disabled={builderNodes.length === 1}
                    >
                      Удалить узел
                    </Button>
                  </Box>
                </Paper>
              ))}
              <Button variant="outlined" onClick={addNode}>
                Добавить узел
              </Button>
            </>
          )}
          {createMode === 'json' && (
            <TextField
              label="Структура сценария (JSON)"
              value={scenarioJson}
              onChange={(e) => setScenarioJson(e.target.value)}
              multiline
              rows={10}
              fullWidth
              placeholder={`{
  "root_node_key": "start",
  "nodes": [
    {
      "key": "start",
      "question": "Что происходит?",
      "is_final": false,
      "answers": [
        { "text": "Вариант 1", "next_node_key": "n1" },
        { "text": "Вариант 2", "next_node_key": "n2" }
      ]
    },
    {
      "key": "n1",
      "question": "Финал 1",
      "is_final": true,
      "final_action": "Действие для финала 1",
      "answers": []
    },
    {
      "key": "n2",
      "question": "Финал 2",
      "is_final": true,
      "final_action": "Действие для финала 2",
      "answers": []
    }
  ]
}`}
            />
          )}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button type="submit" variant="contained">
              {createMode === 'json'
                ? 'Создать сценарий по JSON'
                : 'Создать сценарий'}
            </Button>
            {createMode === 'basic' && (
              <Button variant="outlined" onClick={handleOpenExistingByName}>
                Открыть существующий по названию
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ padding: 3 }}>
        <Typography variant="h5" gutterBottom>
          Доступные сценарии
        </Typography>
        <List>
          {scenarios.map((s) => (
            <Box key={s.id}>
              <ListItem sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <ListItemText
                  primary={s.name}
                  secondary={s.description || 'Без описания'}
                  sx={{ pr: 1, wordBreak: 'break-word' }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, mt: 0.5 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/admin/scenarios/${s.id}/edit`)}
                  >
                    Редактировать
                  </Button>
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={() => handleDelete(s.id)}
                  >
                    Удалить
                  </Button>
                </Box>
              </ListItem>
              <Divider />
            </Box>
          ))}
        </List>
      </Paper>

      <Paper sx={{ padding: 3, mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Логи операторов</Typography>
          <Button variant="outlined" onClick={refreshOperatorLogs}>
            Обновить логи
          </Button>
        </Box>
        <List>
          {operatorLogs.map((log) => (
            <Box key={log.id}>
              <ListItem>
                <ListItemText
                  primary={`${log.operator_username} — ${log.action_type}`}
                  secondary={`Время: ${new Date(log.created_at).toLocaleString()} | Сценарий: ${log.scenario_id ?? '—'} | Сессия: ${log.session_id ?? '—'} | Узел: ${log.node_id ?? '—'} | Ответ: ${log.answer_id ?? '—'}${log.details ? ` | ${log.details}` : ''}`}
                />
              </ListItem>
              <Divider />
            </Box>
          ))}
          {operatorLogs.length === 0 && (
            <ListItem>
              <ListItemText primary="Логи пока отсутствуют" />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  )
}

export default AdminPanel

