(() => {
  const root = document.querySelector('.listening-candidate')
  const options = Array.from(document.querySelectorAll('.choice-option'))
  const replayButtons = Array.from(document.querySelectorAll('.listening-prompt, .feedback-retry button'))
  const queryState = new URLSearchParams(window.location.search).get('state')

  function statePayload() {
    const state = root.dataset.state
    return {
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: `listening_${state}`,
      audioTarget: 'egg',
      targetVisible: state === 'correct',
      options: ['鸡蛋', '母鸡', '苹果', '面包'],
      selected: state === 'correct' ? '鸡蛋' : state === 'retry' ? '母鸡' : null,
      controls: ['back', 'replay_word', 'answer_A', 'answer_B', 'answer_C', 'answer_D'],
    }
  }

  function setState(state) {
    root.dataset.state = state
    document.body.dataset.gameState = JSON.stringify(statePayload())
  }

  options.forEach((option) => option.addEventListener('click', () => setState(option.dataset.answer === 'correct' ? 'correct' : 'retry')))
  replayButtons.forEach((button) => button.addEventListener('click', () => { button.dataset.played = 'true' }))

  setState(queryState === 'correct' || queryState === 'retry' ? queryState : 'ready')
  window.render_game_to_text = () => JSON.stringify(statePayload())
  window.advanceTime = () => undefined
})()
