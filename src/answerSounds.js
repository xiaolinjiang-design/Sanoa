let currentSound

export function playAnswerSound(correct) {
  try {
    currentSound?.pause()
    const sound = new Audio(correct ? '/sounds/correct.wav' : '/sounds/incorrect.wav')
    sound.volume = 0.85
    currentSound = sound
    sound.play().catch((error) => console.warn('Answer sound unavailable:', error.message))
  } catch (error) {
    console.warn('Answer sound unavailable:', error.message)
  }
}
