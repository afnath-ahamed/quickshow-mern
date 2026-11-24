import { useEffect, useState } from 'react'

type QueryResult<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

export default function useMovieQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    load: typeof load
    attempt: number
    result: QueryResult<T>
  }>()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    void load(signal).then((data) => {
      if (!signal.aborted) setState({ load, attempt, result: { status: 'success', data } })
    }).catch((error: unknown) => {
      if (!signal.aborted) {
        const message = error instanceof Error ? error.message : 'Could not load this page.'
        setState({ load, attempt, result: { status: 'error', message } })
      }
    })
    return () => controller.abort()
  }, [load, attempt])

  const result: QueryResult<T> = state?.load === load && state.attempt === attempt
    ? state.result
    : { status: 'loading' }
  return { result, retry: () => setAttempt((value) => value + 1) }
}
