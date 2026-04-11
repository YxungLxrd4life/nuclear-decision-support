export interface Answer {
  id: number
  text: string
  next_node_id?: number
}

export interface Node {
  id: number
  question: string
  is_final: boolean
  final_action?: string
  answers: Answer[]
}

export interface Scenario {
  id: number
  name: string
  description: string
  root_node_id?: number
}