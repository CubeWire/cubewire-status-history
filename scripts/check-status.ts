import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import config from '../config.json'

interface StatusHistory {
  status: 'up' | 'down'
  timestamp: string
  responseTime: number
}

interface ConfigService {
  name: string
  url: string
  auth: boolean
  secret?: string
}

async function checkService(service: ConfigService): Promise<StatusHistory> {
  const startTime = Date.now()
  try {
    const headers: HeadersInit = {}
    if (service.auth && service.secret) {
      headers['Authorization'] = `Bearer ${service.secret}`
    }

    const response = await fetch(service.url, { headers })
    const responseTime = Date.now() - startTime

    return {
      status: response.ok ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      responseTime
    }
  } catch (error) {
    return {
      status: 'down',
      timestamp: new Date().toISOString(),
      responseTime: 0
    }
  }
}

async function updateHistory() {
  const historyDir = path.join(process.cwd(), 'history')
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true })
  }

  for (const service of config.services) {
    const status = await checkService(service)
    const historyFile = path.join(historyDir, `${service.name.toLowerCase().replace(/\s+/g, '-')}.yml`)
    
    let history: StatusHistory[] = []
    if (fs.existsSync(historyFile)) {
      const content = fs.readFileSync(historyFile, 'utf8')
      history = yaml.load(content) as StatusHistory[]
    }

    history.push(status)
    // Keep only last 1000 entries
    if (history.length > 1000) {
      history = history.slice(-1000)
    }

    fs.writeFileSync(historyFile, yaml.dump(history))
  }
}

updateHistory().catch(console.error) 
