let voice: SpeechSynthesisVoice | null = null

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  return (
    voices.find(v => v.lang === 'en-US' && v.localService) ??
    voices.find(v => v.lang === 'en-US') ??
    voices.find(v => v.lang.startsWith('en')) ??
    null
  )
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    voice = pickVoice()
  }
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  if (!voice) voice = pickVoice()
  if (voice) utter.voice = voice
  utter.lang = 'en-US'
  utter.rate = 0.85
  window.speechSynthesis.speak(utter)
}
