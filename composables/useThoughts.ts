export interface Thought {
  id: string
  content: string
  category: 'reflection' | 'experience' | 'plan' | 'feeling'
  created: number
}

export interface ThoughtsResponse {
  thoughts: Thought[]
  total: number
  page: number
  pages: number
}

export interface StatsResponse {
  total: number
  deleted: number
  reflection: number
  experience: number
  plan: number
  feeling: number
}

export interface RegistryEntry {
  db_name: string
  display_name: string
  icon?: string
  count?: number
}

export const CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
  feeling:    { label: '心情碎片', icon: '💗' },
  reflection: { label: '脑海涟漪', icon: '🔮' },
  experience: { label: '日常片段', icon: '🌿' },
  plan:       { label: '小小念头', icon: '☁️' },
}

export function useThoughts() {
  const thoughts = useState<Thought[]>('thoughts', () => [])
  const stats = useState<StatsResponse | null>('stats', () => null)
  const loading = useState<boolean>('thoughts-loading', () => false)
  const currentPage = useState<number>('thoughts-page', () => 1)
  const totalPages = useState<number>('thoughts-pages', () => 1)
  const total = useState<number>('thoughts-total', () => 0)

  // Current db context
  const currentDb = useState<string>('current-db', () => '')

  async function fetchAllThoughts(dbName: string) {
    loading.value = true
    currentDb.value = dbName
    thoughts.value = []

    try {
      const first = await $fetch<ThoughtsResponse>('/api/thoughts', {
        query: { db: dbName, page: 1, limit: 200 },
      })
      let all = first.thoughts

      for (let p = 2; p <= first.pages; p++) {
        const next = await $fetch<ThoughtsResponse>('/api/thoughts', {
          query: { db: dbName, page: p, limit: 200 },
        })
        all = all.concat(next.thoughts)
      }

      thoughts.value = all
      total.value = first.total
    } catch (err) {
      console.error('Failed to fetch thoughts:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchStats(dbName: string) {
    try {
      stats.value = await $fetch<StatsResponse>('/api/thoughts/stats', {
        query: { db: dbName },
      })
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  return {
    thoughts,
    stats,
    loading,
    currentPage,
    totalPages,
    total,
    currentDb,
    fetchAllThoughts,
    fetchStats,
  }
}
