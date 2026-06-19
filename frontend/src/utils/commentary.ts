type EventConfig = {
  emoji: string
  color: string  // hex or CSS var
  label: string
}

const EVENT_MAP: Record<string, EventConfig> = {
  // Cricket
  boundary:    { emoji: '🏏', color: '#14B8A6', label: 'Boundary' },
  six:         { emoji: '💥', color: '#F59E0B', label: 'Six' },
  wicket:      { emoji: '🎯', color: '#EF4444', label: 'Wicket' },
  // Football  
  goal:        { emoji: '⚽', color: '#F59E0B', label: 'Goal' },
  card:        { emoji: '🟨', color: '#EF4444', label: 'Card' },
  substitution:{ emoji: '🔄', color: '#6B7280', label: 'Sub' },
  // Kabaddi
  raid:        { emoji: '🤸', color: '#F97316', label: 'Raid' },
  tackle:      { emoji: '💪', color: '#3B82F6', label: 'Tackle' },
  // Generic
  event:       { emoji: '📋', color: '#6B7280', label: 'Event' },
}

export function getEventConfig(eventType: string): EventConfig {
  return EVENT_MAP[eventType] ?? EVENT_MAP['event']
}