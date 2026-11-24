import { useRef, useState } from 'react'

export function useSeatSelection(maxSeats: number) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [selectionMessage, setSelectionMessage] = useState('')
  const request = useRef<{ seats: string; id: string }>(null)

  function toggleSeat(seat: string) {
    const selected = selectedSeats.includes(seat)
    if (!selected && selectedSeats.length >= maxSeats) {
      setSelectionMessage('Choose up to ' + maxSeats + ' seats.')
      return
    }
    setSelectedSeats(selected ? selectedSeats.filter((item) => item !== seat) : [...selectedSeats, seat])
    setSelectionMessage('')
  }

  function removeUnavailable(unavailable: string[]) {
    setSelectedSeats((seats) => seats.filter((seat) => !unavailable.includes(seat)))
  }

  function getRequestId() {
    const key = [...selectedSeats].sort().join(',')
    if (request.current?.seats !== key) {
      request.current = { seats: key, id: crypto.randomUUID() }
    }
    return request.current.id
  }

  return { selectedSeats, selectionMessage, toggleSeat, removeUnavailable, getRequestId }
}
