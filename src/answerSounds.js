let audioContext
let stopCurrentSound

export async function playAnswerSound(correct) {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  try {
    audioContext ||= new AudioContext()
    if (audioContext.state === 'suspended') await audioContext.resume()
    if (audioContext.state !== 'running') return
    stopCurrentSound?.()
    const start = audioContext.currentTime
    const notes = correct ? [[660, 0, .12], [880, .09, .2]] : [[260, 0, .18], [220, .09, .16]]
    const nodes = notes.map(([frequency, delay, duration]) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0, start + delay)
      gain.gain.linearRampToValueAtTime(.075, start + delay + .012)
      gain.gain.exponentialRampToValueAtTime(.001, start + delay + duration)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      oscillator.start(start + delay)
      oscillator.stop(start + delay + duration + .02)
      return { oscillator, gain }
    })
    stopCurrentSound = () => nodes.forEach(({ oscillator, gain }) => {
      gain.gain.cancelScheduledValues(audioContext.currentTime)
      gain.gain.setTargetAtTime(0, audioContext.currentTime, .005)
      oscillator.stop(audioContext.currentTime + .025)
    })
  } catch (error) {
    console.warn('Answer sound unavailable:', error.message)
  }
}
