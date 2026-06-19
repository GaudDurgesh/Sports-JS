export const getSportColor = (sport: string): string => {
  const colors: Record<string, string> = {
    football: 'bg-blue-100 text-blue-800',
    cricket: 'bg-green-100 text-green-800',
    kabaddi: 'bg-orange-100 text-orange-800',
    basketball: 'bg-purple-100 text-purple-800',
  }
  return colors[sport] ?? 'bg-gray-100 text-gray-700'
}

export const getSportLabel = (sport: string): string => {
  const labels: Record<string, string> = {
    football: 'Football',
    cricket: 'Cricket',
    kabaddi: 'Kabaddi',
    basketball: 'Basketball',
  }

  return labels[sport] ?? sport
}

export const getStatusLabel = (status: string, startTime: string): string => {
  if (status === 'finished') return 'FT'
  if (status === 'scheduled') {
    return new Date(startTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return status
}

export const getSportAccent = (sport: string): string => {
  const accents: Record<string, string> = {
    football: 'bg-blue-500',
    cricket: 'bg-green-500',
    kabaddi: 'bg-orange-500',
    basketball: 'bg-purple-500',
  }
  return accents[sport] ?? 'bg-gray-400'
}

export const getSportHex = (sport: string): string => {
  const hex: Record<string, string> = {
    football:   '#3B82F6',
    cricket:    '#14B8A6',
    kabaddi:    '#F97316',
    basketball: '#A855F7',
  }
  return hex[sport] ?? '#6B7280'
}