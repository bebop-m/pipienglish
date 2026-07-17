(() => {
  const root = document.querySelector('.choice-candidate')
  const options = Array.from(document.querySelectorAll('.choice-option'))
  const wordButton = document.querySelector('.word-prompt')
  const queryState = new URLSearchParams(window.location.search).get('state')

  function setState(state) {
    root.dataset.state = state
    document.body.dataset.gameState = JSON.stringify(statePayload())
  }

  function statePayload() {
    return {
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: `choice_${root.dataset.state}`,
      word: 'egg',
      prompt: '这个单词是什么意思？',
      options: ['鸡蛋', '母鸡', '苹果', '面包'],
      selected: root.dataset.state === 'correct' ? '鸡蛋' : root.dataset.state === 'retry' ? '母鸡' : null,
      controls: ['back', 'replay_word', 'answer_A', 'answer_B', 'answer_C', 'answer_D'],
    }
  }

  options.forEach((option) => option.addEventListener('click', () => {
    setState(option.dataset.answer === 'correct' ? 'correct' : 'retry')
  }))
  wordButton.addEventListener('click', () => { wordButton.dataset.played = 'true' })

  setState(queryState === 'correct' || queryState === 'retry' ? queryState : 'ready')
  window.render_game_to_text = () => JSON.stringify(statePayload())
  window.advanceTime = () => undefined
})()
