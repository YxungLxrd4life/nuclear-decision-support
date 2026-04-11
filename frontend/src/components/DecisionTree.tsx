import { useState } from 'react'
import { Node } from '../types'
import { answerSession } from '../services/api'
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Divider,
  Chip
} from '@mui/material'

interface Props {
  rootNode: Node
  sessionId: number
}

const DecisionTree = ({ rootNode, sessionId }: Props) => {
  const [currentNode, setCurrentNode] = useState<Node>(rootNode)
  const [history, setHistory] = useState<string[]>([])

  const handleAnswer = async (answerId?: number, answerText?: string) => {
    if (!answerId) return
    if (answerText) {
      setHistory((prev) => [...prev, answerText])
    }

    const { current_node } = await answerSession(sessionId, answerId)
    setCurrentNode(current_node)
  }

  const restart = () => {
    setCurrentNode(rootNode)
    setHistory([])
  }

  const getStatusColor = () => {
    if (currentNode.is_final) return 'error'
    return 'primary'
  }

  return (
    <Card
      sx={{
        maxWidth: 800,
        margin: '2rem auto',
        padding: 2
      }}
    >
      <CardContent>

        {/* Заголовок состояния */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Chip
            label={currentNode.is_final ? 'ФИНАЛЬНОЕ РЕШЕНИЕ' : 'ШАГ СЦЕНАРИЯ'}
            color={getStatusColor()}
          />
          <Button variant="outlined" onClick={restart}>
            Начать заново
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Вопрос */}
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          {currentNode.question}
        </Typography>

        {/* История */}
        {history.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2">
              Принятые решения:
            </Typography>
            {history.map((h, index) => (
              <Typography key={index} variant="body2">
                • {h}
              </Typography>
            ))}
          </Box>
        )}

        {/* Финальное действие */}
        {currentNode.is_final ? (
          <Alert
            severity="error"
            sx={{
              mt: 3,
              whiteSpace: 'pre-line',
              fontSize: '1rem'
            }}
          >
            {currentNode.final_action}
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 3
            }}
          >
            {currentNode.answers.map((answer) => (
              <Button
                key={answer.id}
                variant="contained"
                size="large"
                onClick={() => handleAnswer(answer.id, answer.text)}
              >
                {answer.text}
              </Button>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default DecisionTree