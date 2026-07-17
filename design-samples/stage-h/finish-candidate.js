(() => {
  const root = document.querySelector('.finish-candidate')
  const button = document.querySelector('.finish-return')

  const statePayload = () => ({
    coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
    screen: `lesson_finish_${root.dataset.state}`,
    praise: '真棒！',
    character: 'mother_hen_thumbsup',
    summary: { newWords: 4, reviews: 6, streakDays: 3, eggsEarned: 1 },
    controls: ['return_farm'],
  })

  button.addEventListener('click', () => {
    root.dataset.state = 'returning'
    button.textContent = '正在回农场…'
    document.body.dataset.gameState = JSON.stringify(statePayload())
  })

  document.body.dataset.gameState = JSON.stringify(statePayload())
  window.render_game_to_text = () => JSON.stringify(statePayload())
  window.advanceTime = () => undefined
})()
