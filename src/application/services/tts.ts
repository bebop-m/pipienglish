let voice: SpeechSynthesisVoice | null = null

export function selectEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find(v => v.lang.toLowerCase() === 'en-us' && v.localService) ??
    voices.find(v => v.lang.toLowerCase() === 'en-us') ??
    voices.find(v => v.lang.toLowerCase().startsWith('en')) ??
    null
  )
}

function getSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

const browserSynthesis = getSynthesis()
if (browserSynthesis) {
  browserSynthesis.addEventListener('voiceschanged', () => {
    voice = selectEnglishVoice(browserSynthesis.getVoices())
  })
}

/** 播放成功提交时返回 true；设备无本地 TTS 时无声降级，不阻塞交互。 */
export function speak(text: string): boolean {
  const synthesis = getSynthesis()
  if (!text.trim() || !synthesis || typeof SpeechSynthesisUtterance === 'undefined') return false

  synthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  if (!voice) voice = selectEnglishVoice(synthesis.getVoices())
  if (voice) utter.voice = voice
  utter.lang = 'en-US'
  utter.rate = 0.85
  synthesis.speak(utter)
  return true
}
