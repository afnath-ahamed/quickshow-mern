import { useState } from 'react'

export function useSeatSelection() {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  return { selectedSeats, setSelectedSeats }
}
