import axios from 'axios'
import { Scenario, Node } from '../types'

export interface ScenarioAnswerDraft {
  text: string
  next_node_key?: string
}

export interface ScenarioNodeDraft {
  key: string
  question: string
  is_final?: boolean
  final_action?: string
  answers: ScenarioAnswerDraft[]
}

export interface ScenarioWithNodesCreate {
  name: string
  description: string
  root_node_key: string
  nodes: ScenarioNodeDraft[]
}

export interface OperatorActionLog {
  id: number
  created_at: string
  operator_username: string
  action_type: string
  scenario_id?: number
  session_id?: number
  node_id?: number
  answer_id?: number
  details?: string
}

const apiBase =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000'

const api = axios.create({
  baseURL: apiBase
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const login = async (
  username: string,
  password: string
): Promise<string> => {
  // #region agent log
  fetch('http://127.0.0.1:7634/ingest/aa3d791d-3b23-46fa-8bfc-b10720f1076d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a8db46'},body:JSON.stringify({sessionId:'a8db46',runId:'pre-fix',hypothesisId:'H1',location:'api.ts:login:beforeRequest',message:'Auth request started',data:{usernamePresent:username.length>0,grantType:'password'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  params.append('grant_type', 'password')
  try {
    const { data } = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    // #region agent log
    fetch('http://127.0.0.1:7634/ingest/aa3d791d-3b23-46fa-8bfc-b10720f1076d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a8db46'},body:JSON.stringify({sessionId:'a8db46',runId:'pre-fix',hypothesisId:'H2',location:'api.ts:login:success',message:'Auth request success',data:{hasAccessToken:Boolean(data?.access_token),tokenType:data?.token_type??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return data.access_token as string
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7634/ingest/aa3d791d-3b23-46fa-8bfc-b10720f1076d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a8db46'},body:JSON.stringify({sessionId:'a8db46',runId:'pre-fix',hypothesisId:'H1',location:'api.ts:login:catch',message:'Auth request failed',data:{status:error?.response?.status??null,code:error?.code??null,message:error?.message??'unknown'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw error
  }
}

export const fetchScenarios = async (): Promise<Scenario[]> => {
  const { data } = await api.get('/scenarios')
  return data
}

export const fetchScenario = async (scenarioId: number): Promise<Scenario> => {
  const { data } = await api.get(`/scenarios/${scenarioId}`)
  return data
}

export const startSession = async (
  scenarioId: number
): Promise<{ session_id: number; current_node: Node }> => {
  const { data } = await api.post('/sessions/start', { scenario_id: scenarioId })
  return data
}

export const answerSession = async (
  sessionId: number,
  answerId: number
): Promise<{ session_id: number; current_node: Node }> => {
  const { data } = await api.post(
    `/sessions/${sessionId}/answer`,
    null,
    {
      params: { answer_id: answerId }
    }
  )
  return data
}

export const createScenario = async (
  scenario: Omit<Scenario, 'id' | 'root_node_id'>
): Promise<Scenario> => {
  const { data } = await api.post('/scenarios', {
    name: scenario.name,
    description: scenario.description
  })
  return data
}

export const createScenarioWithNodes = async (
  scenario: ScenarioWithNodesCreate
): Promise<Scenario> => {
  const { data } = await api.post('/scenarios/with-nodes', scenario)
  return data
}

export const updateScenario = async (
  scenarioId: number,
  scenario: Omit<Scenario, 'id' | 'root_node_id'>
): Promise<Scenario> => {
  const { data } = await api.put(`/scenarios/${scenarioId}`, {
    name: scenario.name,
    description: scenario.description
  })
  return data
}

export const deleteScenario = async (scenarioId: number): Promise<void> => {
  await api.delete(`/scenarios/${scenarioId}`)
}

export const fetchOperatorLogs = async (
  limit = 200
): Promise<OperatorActionLog[]> => {
  const { data } = await api.get('/admin/operator-logs', {
    params: { limit }
  })
  return data
}