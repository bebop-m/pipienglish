(() => {
  const root = document.querySelector('.dictation-candidate')
  const input = document.querySelector('#dictation-answer')
  const submitButton = document.querySelector('.submit-answer')
  const peekButtons = Array.from(document.querySelectorAll('.peek-button'))
  const hidePeekButton = document.querySelector('.hide-peek')
  const queryState = new URLSearchParams(window.location.search).get('state')

  function normalize(value) {
    return value.trim().normalize('NFC').toLocaleLowerCase('en-US')
  }

  function statePayload() {
    const state = root.dataset.state
    return {
      coordinateSystem: '1194x834 logical stage; origin top-left; x right; y down',
      screen: `dictation_${state}`,
      meaning: '鸡蛋',
      answerVisible: state === 'correct' || state === 'peek',
      inputValue: input.value,
      inputMode: 'standard text; keyboard or system handwriting input',
      controls: ['back', 'replay_word', 'input_answer', 'submit_answer', 'peek_answer'],
    }
  }

  function setState(state) {
    root.dataset.state = state
    if (state === 'ready' || state === 'peek') input.value = ''
    if (state === 'correct') input.value = 'egg'
    if (state === 'retry') input.value = 'hen'
    input.readOnly = state === 'correct' || state === 'peek'
    document.body.dataset.gameState = JSON.stringify(statePayload())
  }

  submitButton.addEventListener('click', () => setState(normalize(input.value) === 'egg' ? 'correct' : 'retry'))
  peekButtons.forEach((button) => button.addEventListener('click', () => setState('peek')))
  hidePeekButton.addEventListener('click', () => setState('ready'))
  input.addEventListener('input', () => {
    if (root.dataset.state === 'retry') root.dataset.state = 'ready'
    document.body.dataset.gameState = JSON.stringify(statePayload())
  })

  setState(['correct', 'retry', 'peek'].includes(queryState) ? queryState : 'ready')
  window.render_game_to_text = () => JSON.stringify(statePayload())
  window.advanceTime = () => undefined
})()
